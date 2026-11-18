-- Qonvergence Waitlist. One row per email address.
CREATE TABLE IF NOT EXISTS waitlist (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  email                TEXT NOT NULL UNIQUE,      -- stored trimmed and lower-cased
  source               TEXT NOT NULL DEFAULT 'site',
  consent_text_version TEXT NOT NULL,             -- which consent wording the person agreed to
  created_at           TEXT NOT NULL              -- ISO 8601, UTC
);

-- Hourly attempt counter per caller. Holds a salted hash, never a raw IP.
CREATE TABLE IF NOT EXISTS waitlist_rate (
  ip_hash      TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  attempts     INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, window_start)
);
