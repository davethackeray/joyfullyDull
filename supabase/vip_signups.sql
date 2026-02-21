-- Supabase SQL: Create the vip_signups table
-- Run this in the Supabase SQL Editor for your project.

CREATE TABLE IF NOT EXISTS vip_signups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  joy_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (no public reads by default)
ALTER TABLE vip_signups ENABLE ROW LEVEL SECURITY;

-- Allow insert from service_role only (already granted by default for service_role key)
-- No additional RLS policies needed since we use the service_role key in the Worker.
