-- Grub & Gulp Around the World — Supabase Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS places (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  category        text NOT NULL DEFAULT 'Restaurant',
  price_range     text DEFAULT '$',
  rating          numeric(4,1),
  personal_notes  text,
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  google_maps_url text,
  video_url       text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  google_data     jsonb
);

-- Migration helper to add column if table already exists
ALTER TABLE places ADD COLUMN IF NOT EXISTS google_data jsonb;

-- Enable Row Level Security
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Allow public read
DROP POLICY IF EXISTS "Public read access" ON places;
CREATE POLICY "Public read access"
  ON places FOR SELECT
  USING (true);

-- Allow all inserts (for demo – tighten in production with auth)
DROP POLICY IF EXISTS "Allow insert" ON places;
CREATE POLICY "Allow insert"
  ON places FOR INSERT
  WITH CHECK (true);

-- Allow all updates
DROP POLICY IF EXISTS "Allow update" ON places;
CREATE POLICY "Allow update"
  ON places FOR UPDATE
  USING (true);

-- Allow all deletes
DROP POLICY IF EXISTS "Allow delete" ON places;
CREATE POLICY "Allow delete"
  ON places FOR DELETE
  USING (true);

-- Index on category for filter performance
CREATE INDEX IF NOT EXISTS idx_places_category ON places (category);

-- Index on coordinates for geo queries
CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places (lat, lng);


-- =============================================
-- Categories Table
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  color       text NOT NULL DEFAULT '#E74C3C',
  emoji       text NOT NULL DEFAULT '🍽️',
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on categories" ON categories;
CREATE POLICY "Allow public read on categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write on categories" ON categories;
CREATE POLICY "Allow write on categories" ON categories FOR ALL USING (true);

-- Seed initial categories
INSERT INTO categories (name, color, emoji)
VALUES 
  ('Buffet', '#E26D5C', '🍱'),
  ('Fine Dining', '#8E7DBE', '🍽️'),
  ('Street Food', '#FAAD14', '🌮'),
  ('Bar & Cafe', '#5C80BC', '☕'),
  ('Sea Food', '#4CB9A8', '🦞'),
  ('Restaurant', '#C84B31', '🍜')
ON CONFLICT (name) DO UPDATE 
SET color = EXCLUDED.color, emoji = EXCLUDED.emoji;


-- =============================================
-- Price Ranges Table
-- =============================================
CREATE TABLE IF NOT EXISTS price_ranges (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE price_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on price_ranges" ON price_ranges;
CREATE POLICY "Allow public read on price_ranges" ON price_ranges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write on price_ranges" ON price_ranges;
CREATE POLICY "Allow write on price_ranges" ON price_ranges FOR ALL USING (true);

-- Seed initial price ranges
INSERT INTO price_ranges (label, description)
VALUES 
  ('$', 'ประหยัด'),
  ('$$', 'กลาง'),
  ('$$$', 'สูง')
ON CONFLICT (label) DO UPDATE 
SET description = EXCLUDED.description;
