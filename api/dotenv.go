package main

// Minimal .env loader (no external dependencies). Called once at startup:
// reads KEY=VALUE lines from api/.env next to the executable's working
// directory. Real environment variables always win over file values.

import (
	"bufio"
	"log"
	"os"
	"strings"
)

func loadDotenv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return // .env is optional; pure environment config is valid too.
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if _, exists := os.LookupEnv(key); !exists && key != "" {
			if err := os.Setenv(key, value); err != nil {
				log.Printf("dotenv: could not set %s", key)
			}
		}
	}
}
