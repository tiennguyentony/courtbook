-- Core schema. All timestamps are ISO-8601 strings in UTC.

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'owner', 'admin'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE venues (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE courts (
  id       TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id),
  name     TEXT NOT NULL
);

CREATE TABLE slots (
  id          TEXT PRIMARY KEY,
  court_id    TEXT NOT NULL REFERENCES courts(id),
  starts_at   TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE INDEX slots_by_court_start ON slots(court_id, starts_at);

CREATE TABLE bookings (
  id              TEXT PRIMARY KEY,
  slot_id         TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL CHECK (status IN ('HELD', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  price_cents     INTEGER NOT NULL,
  refund_cents    INTEGER,
  hold_expires_at TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- A slot can have at most one live booking. Cancelled and expired bookings
-- do not count, so the slot can be booked again after them.
CREATE UNIQUE INDEX one_active_booking_per_slot
  ON bookings(slot_id)
  WHERE status IN ('HELD', 'CONFIRMED');

CREATE TABLE idempotency_keys (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  status     INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
