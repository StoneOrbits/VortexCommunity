CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('open', 'closed')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'archived')),
    current_round INTEGER DEFAULT 0,
    current_phase VARCHAR(20) DEFAULT NULL CHECK (current_phase IN ('submission', 'judging')),
    max_participants INTEGER DEFAULT 16,
    created_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    seed INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    competitor1_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    competitor2_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    winner_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    patternset1_id INTEGER REFERENCES pattern_sets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    patternset2_id INTEGER REFERENCES pattern_sets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submission', 'judging', 'completed')),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_sr_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    sr_type VARCHAR(10) NOT NULL CHECK (sr_type IN ('open', 'closed')),
    sr_before INTEGER NOT NULL,
    sr_after INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS open_sr INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closed_sr INTEGER NOT NULL DEFAULT 1000;
