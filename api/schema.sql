-- Haven & Stone API schema (PostgreSQL / Neon).
-- Apply once to the database referenced by DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f api/schema.sql

CREATE TABLE IF NOT EXISTS real_estate_properties (
  id              text PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  price           bigint NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'draft',
  bedrooms        integer NOT NULL DEFAULT 0,
  bathrooms       real NOT NULL DEFAULT 0,
  square_feet     integer NOT NULL DEFAULT 0,
  lot_square_feet integer NOT NULL DEFAULT 0,
  year_built      integer NOT NULL DEFAULT 0,
  property_type   text NOT NULL DEFAULT '',
  listing_type    text NOT NULL DEFAULT '',
  availability    text NOT NULL DEFAULT '',
  available_from  text NOT NULL DEFAULT '',
  payment_plan    text NOT NULL DEFAULT '',
  furnishing      text NOT NULL DEFAULT '',
  tenure          text NOT NULL DEFAULT '',
  is_sold         boolean NOT NULL DEFAULT false,
  is_featured     boolean NOT NULL DEFAULT false,
  address         jsonb NOT NULL DEFAULT '{}'::jsonb,
  coordinates     jsonb NOT NULL DEFAULT '{}'::jsonb,
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS real_estate_properties_status_idx
  ON real_estate_properties (status, updated_at DESC);

-- Idempotent migration for databases created before the listing-details fields.
ALTER TABLE real_estate_properties
  ADD COLUMN IF NOT EXISTS availability   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_from text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_plan   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS furnishing     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tenure         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS listing_type   text NOT NULL DEFAULT '';

-- Idempotent migration for the sold/featured visibility controls.
ALTER TABLE real_estate_properties
  ADD COLUMN IF NOT EXISTS is_sold     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS real_estate_rooms (
  id          text PRIMARY KEY,
  property_id text NOT NULL REFERENCES real_estate_properties (id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  size        text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS real_estate_rooms_property_idx
  ON real_estate_rooms (property_id, sort_order, id);

CREATE TABLE IF NOT EXISTS real_estate_media (
  id          text PRIMARY KEY,
  property_id text NOT NULL REFERENCES real_estate_properties (id) ON DELETE CASCADE,
  url         text NOT NULL,
  alt         text NOT NULL DEFAULT '',
  kind        text NOT NULL DEFAULT 'gallery',
  width       integer NOT NULL DEFAULT 0,
  height      integer NOT NULL DEFAULT 0,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS real_estate_media_property_idx
  ON real_estate_media (property_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS real_estate_leads (
  id          text PRIMARY KEY,
  property_id text NOT NULL DEFAULT '',
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  message     text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'new',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS real_estate_leads_created_idx
  ON real_estate_leads (created_at DESC);

-- Property listing views (analytics). One row per detail-page open.
-- Privacy-safe by design: the visitor IP is NEVER stored. It is hashed together
-- with a daily salt into visitor_token (see app/api/track), which is how unique
-- visitors are counted (a person is counted once per day). Location is coarse
-- (country/region/city) and derived at the edge; source/referrer/device/bot are
-- classifications, not identifiers.
CREATE TABLE IF NOT EXISTS real_estate_property_views (
  id            text PRIMARY KEY,
  property_id   text NOT NULL REFERENCES real_estate_properties (id) ON DELETE CASCADE,
  visitor_token text NOT NULL,
  event_day     date   NOT NULL DEFAULT (current_date),
  country       text   NOT NULL DEFAULT '',
  region        text   NOT NULL DEFAULT '',
  city          text   NOT NULL DEFAULT '',
  source        text   NOT NULL DEFAULT 'direct',
  referrer_host text   NOT NULL DEFAULT '',
  device_type   text   NOT NULL DEFAULT 'unknown',
  is_bot        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Event taxonomy for the same table: 'view' is a detail-page open; the rest are
-- engagement signals on a listing. Idempotent for databases created before this.
ALTER TABLE real_estate_property_views
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'view';

CREATE INDEX IF NOT EXISTS real_estate_property_views_property_idx
  ON real_estate_property_views (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS real_estate_property_views_created_idx
  ON real_estate_property_views (created_at DESC);
CREATE INDEX IF NOT EXISTS real_estate_property_views_country_idx
  ON real_estate_property_views (country);
CREATE INDEX IF NOT EXISTS real_estate_property_views_day_idx
  ON real_estate_property_views (event_day);
CREATE INDEX IF NOT EXISTS real_estate_property_views_type_idx
  ON real_estate_property_views (event_type, created_at DESC);

-- Search queries (analytics). What visitors type and how many results they got.
-- Same privacy stance: no raw IP; a hashed daily token for unique searchers.
-- A result_count of 0 surfaces unmet demand (people searching for something you
-- don't list yet) — the single most actionable insight for a marketplace.
CREATE TABLE IF NOT EXISTS real_estate_searches (
  id            text PRIMARY KEY,
  query         text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  visitor_token text NOT NULL DEFAULT '',
  country       text   NOT NULL DEFAULT '',
  region        text   NOT NULL DEFAULT '',
  city          text   NOT NULL DEFAULT '',
  source        text   NOT NULL DEFAULT 'direct',
  device_type   text   NOT NULL DEFAULT 'unknown',
  is_bot        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS real_estate_searches_created_idx
  ON real_estate_searches (created_at DESC);
CREATE INDEX IF NOT EXISTS real_estate_searches_query_idx
  ON real_estate_searches (lower(query));
