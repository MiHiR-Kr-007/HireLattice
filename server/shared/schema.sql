-- ENUMs for State Machines
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'CONFIRMED', 'CANCELLED');

CREATE TABLE interviewer_pools (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pool_members (
    pool_id INTEGER REFERENCES interviewer_pools(id) ON DELETE CASCADE,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
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
    
    -- interviewer can't double-book themselves manually
    CONSTRAINT no_overlapping_slots EXCLUDE USING gist (
        interviewer_id WITH =,
        tstzrange(start_time_utc, end_time_utc) WITH &&
    )
);