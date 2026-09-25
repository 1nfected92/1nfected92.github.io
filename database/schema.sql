-- The Soleful Goddess booking database schema.
-- This schema is prepared for a secure backend. Do not store real bookings
-- in this public repository or expose database credentials in browser code.

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','confirmed','cancelled','completed','no_show')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_appointment_per_slot
ON appointments(appointment_date, appointment_time)
WHERE status IN ('requested','confirmed');

CREATE INDEX IF NOT EXISTS appointments_by_date
ON appointments(appointment_date, status);

INSERT OR IGNORE INTO services(id,name,description,price_cents,duration_minutes) VALUES
(1,'Reflexology','A focused foot treatment using pressure-point techniques to support circulation, relaxation, and whole-body balance.',8000,60),
(2,'Thai Massage','An energizing blend of assisted stretching, rhythmic compression, and mindful movement to open the body and calm the mind.',10000,60),
(3,'Sports Massage','Targeted therapeutic work for active bodies, helping address areas of tightness and support mobility before or after movement.',13000,60),
(4,'Full Body Massage','A flowing full-body session created to ease everyday tension, quiet the nervous system, and restore a sense of ease.',15000,90);