package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// listProperties returns non-archived listings with marketplace-style
// server-side filtering and sorting driven by query parameters:
//
//	q         text match on title, property type, listing type, or city
//	status    exact listing status (draft|active)
//	listingType exact purpose (Sale|Rent|Commercial)
//	minPrice  price >= minPrice
//	maxPrice  price <= maxPrice
//	beds      bedrooms >= beds
//	baths     bathrooms >= baths
//	sort      updated (default) | price_asc | price_desc | newest
func (s *server) listProperties(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	where := []string{"status <> 'archived'"}
	args := []any{}
	next := func() string {
		args = append(args, nil)
		return "$" + strconv.Itoa(len(args))
	}

	if text := strings.TrimSpace(query.Get("q")); text != "" {
		p := next()
		args[len(args)-1] = "%" + text + "%"
		where = append(where, fmt.Sprintf("(title ILIKE %s OR property_type ILIKE %s OR listing_type ILIKE %s OR address->>'city' ILIKE %s OR address->>'state' ILIKE %s)", p, p, p, p, p))
	}
	if status := strings.TrimSpace(query.Get("status")); status == "all" {
		// Moderated admin view: drafts, active, and sold listings, never archived.
	} else if status != "" && status != "archived" {
		p := next()
		args[len(args)-1] = status
		where = append(where, "status = "+p, "is_sold = false")
	} else {
		// Public default: only published, unsold listings are searchable.
		where = append(where, "status = 'active'", "is_sold = false")
	}
	if lt := strings.TrimSpace(query.Get("listingType")); lt != "" && lt != "all" {
		p := next()
		args[len(args)-1] = lt
		where = append(where, "listing_type = "+p)
	}
	if typ := strings.TrimSpace(query.Get("type")); typ != "" {
		p := next()
		args[len(args)-1] = "%" + typ + "%"
		where = append(where, "property_type ILIKE "+p)
	}
	if v, err := strconv.ParseInt(query.Get("minPrice"), 10, 64); err == nil && v > 0 {
		p := next()
		args[len(args)-1] = v
		where = append(where, "price >= "+p)
	}
	if v, err := strconv.ParseInt(query.Get("maxPrice"), 10, 64); err == nil && v > 0 {
		p := next()
		args[len(args)-1] = v
		where = append(where, "price <= "+p)
	}
	if v, err := strconv.Atoi(query.Get("beds")); err == nil && v > 0 {
		p := next()
		args[len(args)-1] = v
		where = append(where, "bedrooms >= "+p)
	}
	if v, err := strconv.ParseFloat(query.Get("baths"), 32); err == nil && v > 0 {
		p := next()
		args[len(args)-1] = v
		where = append(where, "bathrooms >= "+p)
	}

	order := "is_featured DESC, updated_at DESC"
	switch query.Get("sort") {
	case "price_asc":
		order = "is_featured DESC, price ASC, updated_at DESC"
	case "price_desc":
		order = "is_featured DESC, price DESC, updated_at DESC"
	case "newest":
		order = "is_featured DESC, created_at DESC"
	}

	rows, err := s.db.QueryContext(r.Context(),
		`SELECT `+propertyColumns+` FROM real_estate_properties WHERE `+strings.Join(where, " AND ")+` ORDER BY `+order, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Property{}
	for rows.Next() {
		p, err := scanProperty(rows)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := s.hydrate(r.Context(), &p); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

// getProperty serves a single published listing by id or slug from
// /api/v1/properties/{key}. Drafts, archived, and sold records stay invisible.
func (s *server) getProperty(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimPrefix(r.URL.Path, "/api/v1/properties/")
	row := s.db.QueryRowContext(r.Context(),
		`SELECT `+propertyColumns+` FROM real_estate_properties WHERE (id=$1 OR slug=$1) AND status='active' AND is_sold = false`, key)

	p, err := scanProperty(row)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := s.hydrate(r.Context(), &p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// hydrate attaches the related rooms and media rows to a property.
func (s *server) hydrate(ctx context.Context, p *Property) error {
	p.Rooms = []Room{}
	p.Media = []Media{}

	rooms, err := s.db.QueryContext(ctx,
		`SELECT id,name,size,description FROM real_estate_rooms WHERE property_id=$1 ORDER BY sort_order,id`, p.ID)
	if err != nil {
		return err
	}
	defer rooms.Close()
	for rooms.Next() {
		var room Room
		if err := rooms.Scan(&room.ID, &room.Name, &room.Size, &room.Description); err != nil {
			return err
		}
		p.Rooms = append(p.Rooms, room)
	}

	media, err := s.db.QueryContext(ctx,
		`SELECT id,url,alt,kind,width,height,sort_order,created_at FROM real_estate_media WHERE property_id=$1 ORDER BY sort_order,created_at`, p.ID)
	if err != nil {
		return err
	}
	defer media.Close()
	for media.Next() {
		var m Media
		if err := media.Scan(&m.ID, &m.URL, &m.Alt, &m.Kind, &m.Width, &m.Height, &m.SortOrder, &m.CreatedAt); err != nil {
			return err
		}
		p.Media = append(p.Media, m)
	}
	return nil
}

// uniqueSlug returns base (or base-2, base-3, …) such that no other row in
// real_estate_properties owns the slug. excludeID is the record being updated.
func (s *server) uniqueSlug(ctx context.Context, base, excludeID string) (string, error) {
	candidate := base
	for i := 1; i <= 100; i++ {
		if i > 1 {
			candidate = fmt.Sprintf("%s-%d", base, i)
		}
		var taken bool
		if err := s.db.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM real_estate_properties WHERE slug=$1 AND id<>$2)`,
			candidate, excludeID).Scan(&taken); err != nil {
			return "", err
		}
		if !taken {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not derive a unique slug for %q", base)
}

// adminProperties handles GET (moderated list) and POST (create or upsert).
func (s *server) adminProperties(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		s.listProperties(w, r)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var p Property
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(&p); err != nil || strings.TrimSpace(p.Title) == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	if p.ID == "" {
		p.ID = "property_" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	// Slugs are UNIQUE in the database: derive from the manual slug or the
	// title, then find a variant that no other listing owns. Updating the same
	// record never conflicts with itself.
	base := slugify(p.Slug)
	if base == "" {
		base = slugify(p.Title)
	}
	if base == "" {
		base = "property"
	}
	slug, err := s.uniqueSlug(r.Context(), base, p.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	p.Slug = slug
	if p.Status == "" {
		p.Status = "draft"
	}
	// Normalise amenities server-side: trim, drop blanks, and remove
	// case-insensitive duplicates so no client can store a noisy list.
	if len(p.Features) > 0 {
		seen := map[string]bool{}
		clean := make([]string, 0, len(p.Features))
		for _, f := range p.Features {
			f = strings.TrimSpace(f)
			if f == "" {
				continue
			}
			key := strings.ToLower(f)
			if seen[key] {
				continue
			}
			seen[key] = true
			clean = append(clean, f)
		}
		p.Features = clean
	}

	address, _ := json.Marshal(p.Address)
	coords, _ := json.Marshal(p.Coordinates)
	features, _ := json.Marshal(p.Features)

	_, err = s.db.ExecContext(r.Context(), `
		INSERT INTO real_estate_properties
			(id,slug,title,description,price,status,bedrooms,bathrooms,square_feet,lot_square_feet,year_built,property_type,listing_type,availability,available_from,payment_plan,furnishing,tenure,is_sold,is_featured,address,coordinates,features)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
		ON CONFLICT (id) DO UPDATE SET
			slug=EXCLUDED.slug, title=EXCLUDED.title, description=EXCLUDED.description,
			price=EXCLUDED.price, status=EXCLUDED.status, bedrooms=EXCLUDED.bedrooms,
			bathrooms=EXCLUDED.bathrooms, square_feet=EXCLUDED.square_feet,
			lot_square_feet=EXCLUDED.lot_square_feet, year_built=EXCLUDED.year_built,
			property_type=EXCLUDED.property_type, listing_type=EXCLUDED.listing_type,
			availability=EXCLUDED.availability,
			available_from=EXCLUDED.available_from, payment_plan=EXCLUDED.payment_plan,
			furnishing=EXCLUDED.furnishing, tenure=EXCLUDED.tenure,
			is_sold=EXCLUDED.is_sold, is_featured=EXCLUDED.is_featured,
			address=EXCLUDED.address,
			coordinates=EXCLUDED.coordinates, features=EXCLUDED.features, updated_at=now()`,
		p.ID, p.Slug, p.Title, p.Description, p.Price, p.Status,
		p.Bedrooms, p.Bathrooms, p.SquareFeet, p.LotSquareFeet,
		p.YearBuilt, p.PropertyType,
		strings.TrimSpace(p.ListingType),
		strings.TrimSpace(p.Availability), strings.TrimSpace(p.AvailableFrom),
		strings.TrimSpace(p.PaymentPlan), strings.TrimSpace(p.Furnishing), strings.TrimSpace(p.Tenure),
		p.IsSold, p.IsFeatured,
		address, coords, features)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Replace room details when the payload supplies them.
	if len(p.Rooms) > 0 {
		if _, err := s.db.ExecContext(r.Context(), `DELETE FROM real_estate_rooms WHERE property_id=$1`, p.ID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for i, room := range p.Rooms {
			if strings.TrimSpace(room.Name) == "" {
				continue
			}
			roomID := fmt.Sprintf("room_%d_%d", time.Now().UnixNano(), i)
			if _, err := s.db.ExecContext(r.Context(),
				`INSERT INTO real_estate_rooms (id,property_id,name,size,description,sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
				roomID, p.ID, room.Name, room.Size, room.Description, i); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	writeJSON(w, http.StatusCreated, p)
}

// adminProperty serves sub-paths of /api/v1/admin/properties/{id}:
// DELETE archives the listing; PATCH routes back through the upsert handler.
func (s *server) adminProperty(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/properties/")

	switch r.Method {
	case http.MethodDelete:
		_, err := s.db.ExecContext(r.Context(),
			`UPDATE real_estate_properties SET status='archived',updated_at=now() WHERE id=$1`, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case http.MethodPatch:
		r.URL.Path = "/api/v1/admin/properties"
		s.adminProperties(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// setPropertyFlag flips a single boolean visibility flag on a listing without
// requiring the full upsert payload. PATCH /api/v1/admin/properties/{id}/flag
// body: {"field":"sold"|"featured","value":true|false}. The field name is
// whitelisted to a column, so no user input ever reaches the SQL string.
func (s *server) setPropertyFlag(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if strings.TrimSpace(id) == "" {
		http.Error(w, "property id is required", http.StatusBadRequest)
		return
	}
	var body struct {
		Field string `json:"field"`
		Value bool   `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	var col string
	switch body.Field {
	case "sold":
		col = "is_sold"
	case "featured":
		col = "is_featured"
	default:
		http.Error(w, "unknown flag", http.StatusBadRequest)
		return
	}
	if _, err := s.db.ExecContext(r.Context(),
		"UPDATE real_estate_properties SET "+col+"=$1, updated_at=now() WHERE id=$2 AND status <> 'archived'",
		body.Value, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
