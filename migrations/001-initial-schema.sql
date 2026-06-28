-- Initial PostgreSQL schema for Vortex Community
-- Applied as a single transaction by db-migrate.sh

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    "profilePic" VARCHAR(255),
    bio TEXT,
    "emailVerified" BOOLEAN DEFAULT false,
    "verificationToken" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pattern sets table
CREATE TABLE IF NOT EXISTS pattern_sets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB NOT NULL,
    "dataHash" VARCHAR(255) NOT NULL UNIQUE,
    votes INTEGER DEFAULT 0,
    "uploadDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdBy" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Modes table
CREATE TABLE IF NOT EXISTS modes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "deviceType" VARCHAR(255) NOT NULL,
    flags INTEGER NOT NULL,
    "dataHash" VARCHAR(255) NOT NULL UNIQUE,
    votes INTEGER DEFAULT 0,
    "uploadDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdBy" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Downloads table
CREATE TABLE IF NOT EXISTS downloads (
    id SERIAL PRIMARY KEY,
    device VARCHAR(255) NOT NULL,
    version VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    "fileUrl" VARCHAR(255) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "downloadCount" INTEGER DEFAULT 0,
    "releaseDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User sessions (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions (expire);

-- Join table: user favorite patterns
CREATE TABLE IF NOT EXISTS user_favorite_patterns (
    "userId" INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "patternSetId" INTEGER NOT NULL REFERENCES pattern_sets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("userId", "patternSetId")
);

-- Join table: user favorite modes
CREATE TABLE IF NOT EXISTS user_favorite_modes (
    "userId" INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "modeId" INTEGER NOT NULL REFERENCES modes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("userId", "modeId")
);

-- Join table: pattern set upvotes
CREATE TABLE IF NOT EXISTS pattern_set_upvotes (
    "patternSetId" INTEGER NOT NULL REFERENCES pattern_sets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("patternSetId", "userId")
);

-- Join table: mode upvotes
CREATE TABLE IF NOT EXISTS mode_upvotes (
    "modeId" INTEGER NOT NULL REFERENCES modes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("modeId", "userId")
);

-- Join table: mode <-> pattern set mapping with sort order
-- Note: PK is (modeId, sortOrder) because the same pattern can appear at multiple LED positions
-- The patternSetId is NOT part of the PK, allowing duplicates per the original ledPatternOrder.
CREATE TABLE IF NOT EXISTS mode_pattern_sets (
    "modeId" INTEGER NOT NULL REFERENCES modes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "sortOrder" INTEGER NOT NULL,
    "patternSetId" INTEGER NOT NULL REFERENCES pattern_sets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY ("modeId", "sortOrder")
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
