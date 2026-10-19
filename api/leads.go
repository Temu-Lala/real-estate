package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"
)

// createLead records a customer inquiry from the public contact form.
// It validates the HTTP method, required fields, email syntax, and text
// lengths, then persists the trimmed lead to the database.
func (s *server) createLead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var l Lead
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&l); err != nil ||
		strings.TrimSpace(l.Name) == "" || strings.TrimSpace(l.Email) == "" {
		http.Error(w, "name and email are required", http.StatusBadRequest)
		return
	}
	if _, err := mail.ParseAddress(l.Email); err != nil ||
		len(l.Name) > 120 || len(l.Message) > 5000 || len(l.Phone) > 40 {
		http.Error(w, "invalid inquiry details", http.StatusBadRequest)
		return
	}

	l.Name = strings.TrimSpace(l.Name)
	l.Email = strings.TrimSpace(l.Email)
	l.Phone = strings.TrimSpace(l.Phone)
	l.Message = strings.TrimSpace(l.Message)
	l.ID = "lead_" + strconv.FormatInt(time.Now().UnixNano(), 10)

	_, err := s.db.ExecContext(r.Context(),
		`INSERT INTO real_estate_leads (id,property_id,name,email,phone,message) VALUES ($1,$2,$3,$4,$5,$6)`,
		l.ID, l.PropertyID, l.Name, l.Email, l.Phone, l.Message)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	l.Status = "new"
	l.CreatedAt = time.Now().UTC()
	writeJSON(w, http.StatusCreated, l)
}

// adminLeads lists all inquiries (GET) or updates one lead's workflow status (PATCH).
func (s *server) adminLeads(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPatch {
		var q struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		}
		_ = json.NewDecoder(r.Body).Decode(&q)
		_, err := s.db.ExecContext(r.Context(),
			`UPDATE real_estate_leads SET status=$1,updated_at=now() WHERE id=$2`, q.Status, q.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	rows, err := s.db.QueryContext(r.Context(),
		`SELECT id,property_id,name,email,phone,message,status,created_at FROM real_estate_leads ORDER BY created_at DESC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Lead{}
	for rows.Next() {
		var l Lead
		if err := rows.Scan(&l.ID, &l.PropertyID, &l.Name, &l.Email, &l.Phone, &l.Message, &l.Status, &l.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, l)
	}
	writeJSON(w, http.StatusOK, out)
}
