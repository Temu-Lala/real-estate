package main

import (
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// file serves uploaded gallery images from the local upload directory.
// Files live under /uploads/<property-id>/<name>, so the requested path must
// be cleaned and verified to stay inside the uploads root (no traversal).
func (s *server) file(w http.ResponseWriter, r *http.Request) {
	rel := strings.TrimPrefix(filepath.ToSlash(r.URL.Path), "/uploads/")
	clean := filepath.Clean(rel)
	if clean == "." || clean == ".." || filepath.IsAbs(clean) || strings.HasPrefix(clean, "..") {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(s.uploadDir, filepath.FromSlash(clean))
	absRoot, err := filepath.Abs(s.uploadDir)
	if err != nil {
		http.Error(w, "upload misconfigured", http.StatusInternalServerError)
		return
	}
	if absPath, err := filepath.Abs(path); err != nil || !strings.HasPrefix(absPath, filepath.Clean(absRoot)+string(os.PathSeparator)) {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, path)
}

// mediaUpload accepts a multipart form with a propertyId and any number of
// image files (at least one), validates each one, stores it on disk, and
// records a media row. There is no pixel-dimension or photo-count limit —
// the frontend renders every aspect ratio responsively. Files over the in-
// memory threshold spill to temporary storage, so batch size is unbounded.
func (s *server) mediaUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}

	id := strings.TrimSpace(r.FormValue("propertyId"))
	files := r.MultipartForm.File["images"]
	if id == "" || len(files) == 0 {
		http.Error(w, "propertyId and at least one image are required", http.StatusBadRequest)
		return
	}

	// kind groups an upload into the photo gallery or the floor-plan set. Only
	// these two values are accepted; anything else falls back to gallery so the
	// public detail page can render each group in its own section.
	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind != "floorplan" {
		kind = "gallery"
	}

	var exists bool
	if err := s.db.QueryRowContext(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM real_estate_properties WHERE id=$1)`, id).Scan(&exists); err != nil || !exists {
		http.Error(w, "property not found", http.StatusNotFound)
		return
	}

	// Storage layout: every property owns a folder under the uploads root
	// (uploads/<property-id>/media_<ts>_<i>.jpg). The PostgreSQL
	// real_estate_media table is the source of truth — each row links the
	// file to its property (property_id FK) and records url, kind, pixel
	// dimensions and sort order. Unlimited images per property.
	folder := filepath.Base(filepath.Clean(id)) // id exists in DB; keep it path-safe
	dir := filepath.Join(s.uploadDir, folder)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	out := []Media{}
	for i, header := range files {
		m, err := saveImage(dir, folder, i, header, kind)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_, err = s.db.ExecContext(r.Context(),
			`INSERT INTO real_estate_media (id,property_id,url,alt,kind,width,height,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			m.ID, id, m.URL, m.Alt, m.Kind, m.Width, m.Height, m.SortOrder)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, m)
	}
	writeJSON(w, http.StatusCreated, out)
}

// saveImage validates and persists a single upload into the property's folder.
// Accepted formats are JPEG, PNG, and GIF of any pixel dimension, up to 50MB
// each. Actual width and height are recorded so the frontend can choose how
// to render them.
func saveImage(dir, folder string, index int, header *multipart.FileHeader, kind string) (Media, error) {
	if header.Size <= 0 || header.Size > 50<<20 {
		return Media{}, errors.New("each image must be between 1 byte and 50MB")
	}

	f, err := header.Open()
	if err != nil {
		return Media{}, err
	}
	defer f.Close()

	config, format, err := image.DecodeConfig(f)
	if err != nil || (format != "jpeg" && format != "png" && format != "gif") {
		return Media{}, errors.New("only JPEG, PNG, and GIF images are supported")
	}

	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return Media{}, err
	}

	mediaID := fmt.Sprintf("media_%d_%d", time.Now().UnixNano(), index)
	ext := "." + format
	if format == "jpeg" {
		ext = ".jpg"
	}
	name := mediaID + ext

	out, err := os.OpenFile(filepath.Join(dir, name), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return Media{}, err
	}
	defer out.Close()

	if _, err := io.Copy(out, io.LimitReader(f, 50<<20+1)); err != nil {
		return Media{}, err
	}

	ret := Media{
		ID:        mediaID,
		URL:       "/uploads/" + folder + "/" + name,
		Alt:       mediaAlt(kind),
		Kind:      kind,
		Width:     config.Width,
		Height:    config.Height,
		SortOrder: index,
		CreatedAt: time.Now().UTC(),
	}
	return ret, nil
}

// mediaAlt gives each kind a sensible default caption used on the public page.
func mediaAlt(kind string) string {
	if kind == "floorplan" {
		return "Floor plan"
	}
	return "Property image"
}
