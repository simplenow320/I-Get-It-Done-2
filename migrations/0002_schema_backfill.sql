-- Backfill tables and columns that were added with `drizzle-kit push` only and
-- never shipped as a migration (notifications, web push, connector keys, voice
-- quota, team hand-offs). Mirrors shared/schema.ts. Safe to run repeatedly.

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token varchar(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status varchar(50) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_tasks_created integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_intensity varchar(20) DEFAULT 'standard';
ALTER TABLE users ADD COLUMN IF NOT EXISTS escalating_reminders_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS morning_kickoff_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS evening_checkin_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_saver_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS morning_kickoff_hour integer DEFAULT 8;
ALTER TABLE users ADD COLUMN IF NOT EXISTS evening_checkin_hour integer DEFAULT 19;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone_offset_minutes integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_morning_kickoff_date varchar(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_evening_checkin_date varchar(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_saver_date varchar(10);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS nudge_count integer DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_nudge_at timestamp;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delegated_to_user_id varchar(255) REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delegation_status varchar(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delegated_at timestamp;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_delegation_update timestamp;

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vapid_config (
  id integer PRIMARY KEY DEFAULT 1,
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_keys (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash varchar(64) NOT NULL UNIQUE,
  key_prefix varchar(16) NOT NULL,
  label varchar(100),
  last_used_at timestamp,
  revoked_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_usage (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar(255) REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  seconds_used integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Lookups the Team screens and quota checks run on every load.
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_to_user_id ON tasks (delegated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee_email ON team_invites (lower(invitee_email));
CREATE INDEX IF NOT EXISTS idx_voice_usage_user_date ON voice_usage (user_id, date);
