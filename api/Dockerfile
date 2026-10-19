# Builds and runs the Haven & Stone Go API as a normal long-lived server.
# Build context = repository root:
#   docker build -f api/Dockerfile -t platinum-api .
# You MUST supply DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET,
# COOKIE_SECURE (true in prod) at runtime, and mount a persistent volume at /data
# so uploaded images survive restarts/redeploys.

FROM golang:1.22 AS build
WORKDIR /src
# Cache module downloads separately from source changes.
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api .

FROM gcr.io/distroless/static-debian12 AS final
WORKDIR /app
COPY --from=build /out/api /app/api
# Persistent, writable location for uploads (mount a real volume here).
ENV UPLOAD_DIR=/data/uploads
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/api"]
