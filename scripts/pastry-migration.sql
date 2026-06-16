-- Run this in the Supabase SQL editor before running the import script
-- Adds new columns to ingredient_master for Pastry Hub reference data

ALTER TABLE public.ingredient_master
  ADD COLUMN IF NOT EXISTS kcal_per_100g  integer,
  ADD COLUMN IF NOT EXISTS pastry_notes   text,
  ADD COLUMN IF NOT EXISTS default_unit_size numeric,
  ADD COLUMN IF NOT EXISTS venue_id       uuid REFERENCES public.venues(id);
