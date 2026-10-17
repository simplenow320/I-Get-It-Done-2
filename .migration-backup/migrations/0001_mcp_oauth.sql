-- MCP OAuth: dynamic client registration + PKCE authorization code flow.
-- Safe to run repeatedly (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS oauth_clients (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_name varchar(255),
  redirect_uris text NOT NULL,
  token_endpoint_auth_method varchar(50) DEFAULT 'none',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_codes (
  code varchar(255) PRIMARY KEY,
  client_id varchar(255) NOT NULL,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge varchar(255),
  code_challenge_method varchar(10),
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id varchar(255) NOT NULL,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_hash varchar(64) NOT NULL UNIQUE,
  refresh_token_hash varchar(64) UNIQUE,
  access_expires_at timestamp NOT NULL,
  refresh_expires_at timestamp,
  revoked_at timestamp,
  last_used_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires_at ON oauth_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_expires_at ON oauth_tokens (access_expires_at);
