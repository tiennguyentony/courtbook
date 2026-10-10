CREATE TABLE waitlist (
  id         TEXT PRIMARY KEY,
  slot_id    TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL CHECK (status IN ('WAITING', 'OFFERED')),
  created_at TEXT NOT NULL
);

CREATE INDEX waitlist_by_slot ON waitlist(slot_id, status);
