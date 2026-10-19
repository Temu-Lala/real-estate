package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const sessionCookie = "haven_admin"

// loginHandler checks the submitted credentials against the ADMIN_EMAIL and
// ADMIN_PASSWORD environment variables using constant-time comparison, then
// issues a signed, httpOnly session cookie valid for 8 hours.
func loginHandler(w http.ResponseWriter, r *http.Request) {
	var q LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil ||
		!hmac.Equal([]byte(q.Email), []byte(os.Getenv("ADMIN_EMAIL"))) ||
		!hmac.Equal([]byte(q.Password), []byte(os.Getenv("ADMIN_PASSWORD"))) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    signToken(q.Email),
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   28800,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "authenticated"})
}

// logoutHandler clears the session cookie for a signed-in admin.
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

// signToken builds "hex(payload).hex(hmac)" with payload "email.expiryUnix".
func signToken(email string) string {
	secret := os.Getenv("ADMIN_SESSION_SECRET")
	payload := email + "." + strconv.FormatInt(time.Now().Add(8*time.Hour).Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString([]byte(payload)) + "." + hex.EncodeToString(mac.Sum(nil))
}

// requireAdmin rejects requests without a valid signed session cookie.
func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookie)
		if err != nil || !validToken(cookie.Value) {
			http.Error(w, "admin authentication required", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// validToken verifies the HMAC signature and expiry of a session token.
func validToken(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false
	}
	raw, err := hex.DecodeString(parts[0])
	if err != nil {
		return false
	}
	// Payload is "email.expiry" and emails contain dots — split on the last one only.
	at := strings.LastIndexByte(string(raw), '.')
	if at < 0 {
		return false
	}
	expiry, err := strconv.ParseInt(string(raw[at+1:]), 10, 64)
	if err != nil || expiry < time.Now().Unix() {
		return false
	}

	mac := hmac.New(sha256.New, []byte(os.Getenv("ADMIN_SESSION_SECRET")))
	mac.Write(raw)
	expected, err := hex.DecodeString(parts[1])
	if err != nil {
		return false
	}
	return hmac.Equal(mac.Sum(nil), expected)
}
