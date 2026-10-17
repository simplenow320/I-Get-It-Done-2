-- One row per billable AI call (OpenAI task extraction, Deepgram transcription)
-- and one row per RevenueCat webhook event, so the admin can compare what each
-- user used against what they paid. user_id is SET NULL on account deletion so
-- totals survive. Mirrors shared/schema.ts. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS ai_usage (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar(255) REFERENCES users(id) ON DELETE SET NULL,
  provider varchar(20) NOT NULL,
  model varchar(100) NOT NULL,
  feature varchar(50) NOT NULL,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  audio_seconds real DEFAULT 0,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON ai_usage (created_at);
CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx ON ai_usage (user_id, created_at);

CREATE TABLE IF NOT EXISTS billing_events (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id varchar(255) NOT NULL UNIQUE,
  user_id varchar(255) REFERENCES users(id) ON DELETE SET NULL,
  type varchar(50) NOT NULL,
  product_id varchar(255),
  store varchar(50),
  environment varchar(20),
  period_type varchar(20),
  price_usd numeric(12, 4),
  takehome_percentage numeric(6, 4),
  event_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_events_user_id_idx ON billing_events (user_id, event_at);
CREATE INDEX IF NOT EXISTS billing_events_event_at_idx ON billing_events (event_at);
