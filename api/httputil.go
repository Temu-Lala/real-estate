package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
)

// writeJSON serialises v as a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
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
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
