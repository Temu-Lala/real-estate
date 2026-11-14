package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// writeJSON serialises v as a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// slugRx matches anything that is not a lowercase letter, digit or hyphen.
var slugRx = regexp.MustCompile(`[^a-z0-9-]+`)

// slugify derives a clean URL slug from a title: lowercase, hyphen-separated,
// punctuation removed, runs of hyphens collapsed, no leading/trailing hyphen.
func slugify(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	s = strings.NewReplacer("_", "-", " ", "-", "–", "-", "—", "-").Replace(s)
	s = slugRx.ReplaceAllString(s, "-")
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// withCORS reflects the request origin and allows credentialed cross-origin
// calls from the Next.js frontend, and short-circuits preflight requests.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// CORS headers
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		// Cache static files
		if strings.HasPrefix(r.URL.Path, "/uploads/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// cacheMiddleware adds caching headers for GET requests to public endpoints
func cacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/v1/properties") {
			// Cache property listings for 5 minutes
			w.Header().Set("Cache-Control", "public, max-age=300, s-maxage=300")
			w.Header().Set("Vary", "Accept-Encoding")
		}
		next.ServeHTTP(w, r)
	})
}
