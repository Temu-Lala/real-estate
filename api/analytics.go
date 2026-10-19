package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// trackPayload is what the same-origin Next route (app/api/track) forwards after
// it has already resolved coarse geo, classified source/device, flagged bots and
// hashed the visitor IP into a rotating daily token. No raw IP ever reaches here.
type trackPayload struct {
	Event        string `json:"event"` // view | gallery | plan | inquiry | card | search
	PropertyID   string `json:"propertyId"`
	VisitorToken string `json:"visitorToken"`
	Country      string `json:"country"`
	Region       string `json:"region"`
	City         string `json:"city"`
	Source       string `json:"source"`
	ReferrerHost string `json:"referrerHost"`
	DeviceType   string `json:"deviceType"`
	IsBot        bool   `json:"isBot"`
	Query        string `json:"query"`   // search only
	Results      int    `json:"results"` // search only
}

// viewEvents are the property-scoped event types stored in real_estate_property_views.
var viewEvents = map[string]bool{"view": true, "gallery": true, "plan": true, "inquiry": true, "card": true}

// clampStr trims and hard-caps a value so no caller can overflow a column.
func clampStr(v string, n int) string {
	v = strings.TrimSpace(v)
	if len(v) > n {
		return v[:n]
	}
	return v
}

// trackView stores one analytics event from POST /api/v1/track.
// Unknown/invalid property events are accepted as a silent no-op (204) so the
// beacon never leaks listing existence or breaks the visitor's page.
func (s *server) trackView(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// Optional shared secret: when TRACKING_SECRET is set, only the Next route
	// (which sends the header) can write events, blocking direct abuse.
	if secret := os.Getenv("TRACKING_SECRET"); secret != "" && r.Header.Get("X-Tracking-Secret") != secret {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var p trackPayload
	if err := json.NewDecoder(io.LimitReader(r.Body, 16<<10)).Decode(&p); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	event := strings.ToLower(clampStr(p.Event, 16))
	if event == "" {
		event = "view"
	}
	token := clampStr(p.VisitorToken, 64)

	// Shared, privacy-safe dimensions.
	country := strings.ToUpper(clampStr(p.Country, 4))
	region := strings.ToUpper(clampStr(p.Region, 8))
	city := clampStr(p.City, 64)
	source := strings.ToLower(clampStr(p.Source, 32))
	if source == "" {
		source = "direct"
	}
	referrerHost := strings.ToLower(clampStr(p.ReferrerHost, 128))
	deviceType := strings.ToLower(clampStr(p.DeviceType, 16))
	if deviceType == "" {
		deviceType = "unknown"
	}

	// Search events have no property; they land in their own table and surface
	// what people are looking for (and unmet demand when results = 0).
	if event == "search" {
		query := strings.ToLower(clampStr(p.Query, 120))
		if query == "" || token == "" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		results := p.Results
		if results < 0 {
			results = 0
		}
		if results > 100000 {
			results = 100000
		}
		id := "srch_" + strconv.FormatInt(time.Now().UnixNano(), 10)
		_, err := s.db.ExecContext(r.Context(), `
			INSERT INTO real_estate_searches
				(id,query,results_count,visitor_token,country,region,city,source,device_type,is_bot)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, query, results, token, country, region, city, source, deviceType, p.IsBot)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if !viewEvents[event] {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	key := strings.TrimSpace(p.PropertyID)
	if key == "" || token == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Resolve to the canonical id (accept id or slug) and require an active listing.
	var propertyID string
	err := s.db.QueryRowContext(r.Context(),
		`SELECT id FROM real_estate_properties WHERE (id=$1 OR slug=$1) AND status='active'`, key).Scan(&propertyID)
	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id := "view_" + strconv.FormatInt(time.Now().UnixNano(), 10)
	_, err = s.db.ExecContext(r.Context(), `
		INSERT INTO real_estate_property_views
			(id,property_id,visitor_token,event_type,country,region,city,source,referrer_host,device_type,is_bot)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, propertyID, token, event, country, region, city, source, referrerHost, deviceType, p.IsBot)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// propertyViewsFilter builds a shared WHERE clause (+ args) for the property_views
// aggregations. alias prefixes columns for joined queries ("" or "v."); eventTypes
// restricts to specific event types (empty = all). Bots are always excluded.
func propertyViewsFilter(alias string, days int, propertyID string, eventTypes ...string) (string, []any) {
	col := func(name string) string {
		if alias == "" {
			return name
		}
		return alias + "." + name
	}
	where := []string{col("is_bot") + " = false"}
	var args []any
	if len(eventTypes) > 0 {
		placeholders := make([]string, len(eventTypes))
		for i, et := range eventTypes {
			args = append(args, et)
			placeholders[i] = fmt.Sprintf("$%d", len(args))
		}
		where = append(where, fmt.Sprintf("%s IN (%s)", col("event_type"), strings.Join(placeholders, ",")))
	}
	if days > 0 {
		args = append(args, days)
		where = append(where, fmt.Sprintf("%s >= now() - make_interval(days => $%d)", col("created_at"), len(args)))
	}
	if propertyID != "" {
		args = append(args, propertyID)
		where = append(where, fmt.Sprintf("%s = $%d", col("property_id"), len(args)))
	}
	return "WHERE " + strings.Join(where, " AND "), args
}

// searchFilter builds a WHERE clause for the searches table (no property scope).
func searchFilter(days int) (string, []any) {
	where := []string{"is_bot = false"}
	var args []any
	if days > 0 {
		args = append(args, days)
		where = append(where, fmt.Sprintf("created_at >= now() - make_interval(days => $%d)", len(args)))
	}
	return "WHERE " + strings.Join(where, " AND "), args
}

type namedCount struct {
	Key     string `json:"key"`
	Label   string `json:"label"`
	Views   int    `json:"views"`
	Uniques int    `json:"uniques"`
}

type trendPoint struct {
	Day     string `json:"day"`
	Views   int    `json:"views"`
	Uniques int    `json:"uniques"`
}

type propertyStat struct {
	PropertyID string `json:"propertyId"`
	Title      string `json:"title"`
	Slug       string `json:"slug"`
	Views      int    `json:"views"`
	Uniques    int    `json:"uniques"`
}

type searchStat struct {
	Query    string `json:"query"`
	Searches int    `json:"searches"`
	Uniques  int    `json:"uniques"`
}

// adminAnalytics serves GET /api/v1/admin/analytics?days=30|all&propertyId=...
// Core metrics count listing VIEWS (bots excluded); engagement and search
// sections add gallery/plan/inquiry/card actions and what visitors searched for.
func (s *server) adminAnalytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	days := 30
	switch d := q.Get("days"); {
	case d == "":
		// keep default 30
	case d == "all":
		days = 0
	default:
		if n, err := strconv.Atoi(d); err == nil && n >= 0 {
			days = n
		}
	}
	propertyID := strings.TrimSpace(q.Get("propertyId"))

	// View-scoped filters power all headline metrics.
	clause, args := propertyViewsFilter("", days, propertyID, "view")
	joinClause, joinArgs := propertyViewsFilter("v", days, propertyID, "view")

	out := map[string]any{
		"range": map[string]any{"days": days, "allTime": days == 0, "propertyId": propertyID},
	}

	// Totals (views)
	var views, uniques int
	if err := s.db.QueryRowContext(r.Context(),
		`SELECT count(*), count(DISTINCT visitor_token) FROM real_estate_property_views `+clause, args...).Scan(&views, &uniques); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	out["totals"] = map[string]any{"views": views, "uniqueVisitors": uniques}

	// Bot views filtered out (transparency) — across all event types.
	botWhere := []string{"is_bot = true"}
	var botArgs []any
	if days > 0 {
		botArgs = append(botArgs, days)
		botWhere = append(botWhere, fmt.Sprintf("created_at >= now() - make_interval(days => $%d)", len(botArgs)))
	}
	if propertyID != "" {
		botArgs = append(botArgs, propertyID)
		botWhere = append(botWhere, fmt.Sprintf("property_id = $%d", len(botArgs)))
	}
	var bots int
	_ = s.db.QueryRowContext(r.Context(),
		`SELECT count(*) FROM real_estate_property_views WHERE `+strings.Join(botWhere, " AND "), botArgs...).Scan(&bots)
	out["botsFiltered"] = bots

	// Daily trend (views)
	if rows, err := s.db.QueryContext(r.Context(),
		`SELECT to_char(event_day,'YYYY-MM-DD'), count(*), count(DISTINCT visitor_token)
		 FROM real_estate_property_views `+clause+` GROUP BY event_day ORDER BY event_day ASC`, args...); err == nil {
		trend := []trendPoint{}
		for rows.Next() {
			var t trendPoint
			if rows.Scan(&t.Day, &t.Views, &t.Uniques) == nil {
				trend = append(trend, t)
			}
		}
		rows.Close()
		out["trend"] = trend
	}

	// Top listings by views (join for title/slug)
	if rows, err := s.db.QueryContext(r.Context(),
		`SELECT v.property_id, p.title, p.slug, count(*), count(DISTINCT v.visitor_token)
		 FROM real_estate_property_views v JOIN real_estate_properties p ON p.id = v.property_id
		 `+joinClause+` GROUP BY v.property_id, p.title, p.slug ORDER BY count(*) DESC LIMIT 12`, joinArgs...); err == nil {
		stats := []propertyStat{}
		for rows.Next() {
			var ps propertyStat
			if rows.Scan(&ps.PropertyID, &ps.Title, &ps.Slug, &ps.Views, &ps.Uniques) == nil {
				stats = append(stats, ps)
			}
		}
		rows.Close()
		out["properties"] = stats
	}

	// Engagement actions by event type (all types, no view restriction) — used to
	// show gallery / floor-plan / inquiry opens in the dashboard.
	engClause, engArgs := propertyViewsFilter("", days, propertyID)
	if rows, err := s.db.QueryContext(r.Context(), fmt.Sprintf(
		`SELECT event_type, count(*), count(DISTINCT visitor_token)
		 FROM real_estate_property_views %s GROUP BY event_type ORDER BY count(*) DESC`, engClause), engArgs...); err == nil {
		eng := []namedCount{}
		for rows.Next() {
			var n namedCount
			if rows.Scan(&n.Key, &n.Views, &n.Uniques) == nil {
				n.Label = n.Key
				eng = append(eng, n)
			}
		}
		rows.Close()
		out["engagement"] = eng
	}

	// Generic single-column breakdown helper (view-scoped via clause/args).
	breakdown := func(column string, limit int) []namedCount {
		list := []namedCount{}
		rows, err := s.db.QueryContext(r.Context(), fmt.Sprintf(
			`SELECT COALESCE(NULLIF(%s,''),'unknown'), count(*), count(DISTINCT visitor_token)
			 FROM real_estate_property_views %s GROUP BY 1 ORDER BY count(*) DESC LIMIT %d`, column, clause, limit), args...)
		if err != nil {
			return list
		}
		defer rows.Close()
		for rows.Next() {
			var n namedCount
			if rows.Scan(&n.Key, &n.Views, &n.Uniques) == nil {
				n.Label = n.Key
				list = append(list, n)
			}
		}
		return list
	}
	out["countries"] = breakdown("country", 40)
	out["sources"] = breakdown("source", 20)
	out["devices"] = breakdown("device_type", 10)

	// Search insights: volume, unique searchers, unmet demand, top queries.
	searchClause, searchArgs := searchFilter(days)
	var totalSearches, uniqueSearchers, unmet int
	if err := s.db.QueryRowContext(r.Context(),
		`SELECT count(*), count(DISTINCT visitor_token), count(*) FILTER (WHERE results_count = 0)
		 FROM real_estate_searches `+searchClause, searchArgs...).Scan(&totalSearches, &uniqueSearchers, &unmet); err == nil {
		out["searches"] = map[string]any{"total": totalSearches, "uniqueSearchers": uniqueSearchers, "unmetDemand": unmet}
	}
	if rows, err := s.db.QueryContext(r.Context(),
		`SELECT query, count(*), count(DISTINCT visitor_token)
		 FROM real_estate_searches `+searchClause+` GROUP BY query ORDER BY count(*) DESC LIMIT 15`, searchArgs...); err == nil {
		top := []searchStat{}
		for rows.Next() {
			var st searchStat
			if rows.Scan(&st.Query, &st.Searches, &st.Uniques) == nil {
				top = append(top, st)
			}
		}
		rows.Close()
		out["topSearches"] = top
	} else {
		out["topSearches"] = []searchStat{}
	}

	out["generatedAt"] = time.Now().UTC()
	writeJSON(w, http.StatusOK, out)
}
