CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('open', 'closed')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'archived')),
    current_round INTEGER DEFAULT 0,
    current_phase VARCHAR(20) DEFAULT NULL CHECK (current_phase IN ('submission', 'judging', 'voting')),
    max_participants INTEGER DEFAULT 16,
    created_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    registration_ends_at TIMESTAMPTZ,
    submission_ends_at TIMESTAMPTZ,
    voting_ends_at TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    seed INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    submission1_url VARCHAR(512),
    submission2_url VARCHAR(512),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submission', 'judging', 'voting', 'completed')),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS submission1_url VARCHAR(512);
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS submission2_url VARCHAR(512);

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_ends_at TIMESTAMPTZ;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS submission_ends_at TIMESTAMPTZ;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS voting_ends_at TIMESTAMPTZ;

ALTER TABLE tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_status_check;
ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_status_check CHECK (status IN ('pending', 'submission', 'judging', 'voting', 'completed'));

CREATE TABLE IF NOT EXISTS tournament_votes (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES tournament_matches(id) ON UPDATE CASCADE ON DELETE CASCADE,
    voter_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    competitor_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, voter_id)
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
