// Command api serves the Haven & Stone REST API (properties, leads, media, admin)
// backed by PostgreSQL via pgx. Configuration comes from environment variables
// (see api/.env.example): DATABASE_URL, UPLOAD_DIR, PORT, ADMIN_EMAIL,
// ADMIN_PASSWORD, ADMIN_SESSION_SECRET, COOKIE_SECURE.
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// server holds shared dependencies for every HTTP handler.
type server struct {
	db        *sql.DB
	uploadDir string
}

func main() {
	loadDotenv(".env") // optional local config; real env vars take precedence

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./data/uploads"
	}
	if err := os.MkdirAll(uploadDir, 0750); err != nil {
		log.Fatal(err)
	}

	s := &server{db: db, uploadDir: uploadDir}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /uploads/", s.file)

	// Public read endpoints and lead capture.
	mux.HandleFunc("GET /api/v1/properties", s.listProperties)
	mux.HandleFunc("GET /api/v1/properties/", s.getProperty)
	mux.HandleFunc("POST /api/v1/leads", s.createLead)
	mux.HandleFunc("POST /api/v1/track", s.trackView)

	// Admin endpoints, all behind the signed-session cookie check.
	mux.HandleFunc("POST /api/v1/admin/login", loginHandler)
	mux.Handle("/api/v1/admin/logout", requireAdmin(http.HandlerFunc(logoutHandler)))
	mux.Handle("/api/v1/admin/properties", requireAdmin(http.HandlerFunc(s.adminProperties)))
	mux.Handle("/api/v1/admin/properties/", requireAdmin(http.HandlerFunc(s.adminProperty)))
	mux.Handle("PATCH /api/v1/admin/properties/{id}/flag", requireAdmin(http.HandlerFunc(s.setPropertyFlag)))
	mux.Handle("/api/v1/admin/leads", requireAdmin(http.HandlerFunc(s.adminLeads)))
	mux.Handle("/api/v1/admin/analytics", requireAdmin(http.HandlerFunc(s.adminAnalytics)))
	mux.Handle("/api/v1/admin/media", requireAdmin(http.HandlerFunc(s.mediaUpload)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Haven & Stone API listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, withCORS(mux)))
}

// health reports database availability for load balancers and monitors.
func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	if err := s.db.Ping(); err != nil {
		http.Error(w, "database unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
