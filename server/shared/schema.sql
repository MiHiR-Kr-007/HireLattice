CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('HR', 'INTERVIEWER', 'CANDIDATE');
CREATE TYPE application_status AS ENUM ('APPLIED', 'RANKED', 'SCHEDULED', 'INTERVIEWED', 'HIRED', 'REJECTED');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'CONFIRMED', 'CANCELLED');
CREATE TYPE interview_status AS ENUM ('OFFERED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'COMPLETED', 'CANDIDATE_NO_SHOW', 'INTERVIEWER_NO_SHOW');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL,
    reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    embedding vector(768), 
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    resume_url TEXT NOT NULL,
    ai_match_report JSONB,
    match_score NUMERIC(4, 2),
    status application_status DEFAULT 'APPLIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interviewer_pools (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pool_members (
    pool_id INTEGER REFERENCES interviewer_pools(id) ON DELETE CASCADE,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (pool_id, interviewer_id)
);

CREATE TABLE availability_slots (
    id SERIAL PRIMARY KEY,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone_iana VARCHAR(50) NOT NULL, 
    status slot_status DEFAULT 'AVAILABLE',
    recurrence_group_id UUID DEFAULT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevents an interviewer from double-booking themselves manually
    CONSTRAINT no_overlapping_slots EXCLUDE USING gist (
        interviewer_id WITH =,
        tstzrange(start_time_utc, end_time_utc) WITH &&
    )
);

CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES availability_slots(id) ON DELETE CASCADE,
    status interview_status DEFAULT 'OFFERED',
    feedback JSONB NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prevents multiple active interviews on the same slot
CREATE UNIQUE INDEX unique_active_slot ON interviews (slot_id) WHERE (status = 'CONFIRMED' OR status = 'OFFERED');