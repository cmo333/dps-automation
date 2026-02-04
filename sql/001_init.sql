-- DPS Automation System - PostgreSQL Schema
-- Run: psql -h host -U user -d database -f 001_init.sql

-- ============================================
-- Station Rep Mapping Table
-- ============================================
CREATE TABLE IF NOT EXISTS station_rep_mapping (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) UNIQUE NOT NULL,
    rep_email VARCHAR(255) NOT NULL,
    rep_name VARCHAR(200),
    rep_phone VARCHAR(50),
    facility_type VARCHAR(200),
    station_status VARCHAR(50) DEFAULT 'Active',
    parent_company VARCHAR(300),
    hubspot_station_id VARCHAR(100),
    hubspot_contact_id VARCHAR(100),
    additional_reps JSONB DEFAULT '[]',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_code ON station_rep_mapping(station_code);
CREATE INDEX IF NOT EXISTS idx_rep_email ON station_rep_mapping(rep_email);
CREATE INDEX IF NOT EXISTS idx_station_status ON station_rep_mapping(station_status);

-- ============================================
-- Alert Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100),
    idempotency_key VARCHAR(128) UNIQUE,
    ticket_number VARCHAR(100) NOT NULL,
    station_codes JSONB NOT NULL DEFAULT '[]',
    matched_codes JSONB DEFAULT '[]',
    unmatched_codes JSONB DEFAULT '[]',
    recipients JSONB DEFAULT '[]',
    template_id VARCHAR(100),
    template_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    issue_type VARCHAR(300),
    notes_preview TEXT,
    states JSONB DEFAULT '[]',
    customer_name VARCHAR(200),
    submitter_name VARCHAR(200),
    exception_reason TEXT,
    error_message TEXT,
    email_message_id VARCHAR(500),
    forwarded_message_ids JSONB DEFAULT '[]',
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    forwarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_idempotency ON alert_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_alert_ticket ON alert_log(ticket_number);
CREATE INDEX IF NOT EXISTS idx_alert_status ON alert_log(status);
CREATE INDEX IF NOT EXISTS idx_alert_created ON alert_log(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_station_codes ON alert_log USING GIN(station_codes);

-- ============================================
-- Dead Letter Table
-- ============================================
CREATE TABLE IF NOT EXISTS dead_letter (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100),
    ticket_number VARCHAR(100),
    station_codes JSONB DEFAULT '[]',
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    error_details JSONB,
    failed_node VARCHAR(200),
    input_snapshot JSONB,
    email_message_id VARCHAR(500),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by VARCHAR(200),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolution_action VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadletter_reviewed ON dead_letter(reviewed);
CREATE INDEX IF NOT EXISTS idx_deadletter_error_type ON dead_letter(error_type);
CREATE INDEX IF NOT EXISTS idx_deadletter_created ON dead_letter(created_at);

-- ============================================
-- Sync Log Table (for Station Rep Sync auditing)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'station_rep',
    status VARCHAR(50) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    duration_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_station_rep_mapping_updated_at ON station_rep_mapping;
CREATE TRIGGER update_station_rep_mapping_updated_at
    BEFORE UPDATE ON station_rep_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_log_updated_at ON alert_log;
CREATE TRIGGER update_alert_log_updated_at
    BEFORE UPDATE ON alert_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Upsert function for station rep mapping
-- ============================================
CREATE OR REPLACE FUNCTION upsert_station_rep(
    p_station_code VARCHAR,
    p_rep_email VARCHAR,
    p_rep_name VARCHAR,
    p_rep_phone VARCHAR,
    p_facility_type VARCHAR,
    p_station_status VARCHAR,
    p_parent_company VARCHAR,
    p_hubspot_station_id VARCHAR,
    p_hubspot_contact_id VARCHAR,
    p_additional_reps JSONB
)
RETURNS TABLE(id INTEGER, action VARCHAR) AS $$
DECLARE
    v_id INTEGER;
    v_action VARCHAR;
BEGIN
    INSERT INTO station_rep_mapping (
        station_code, rep_email, rep_name, rep_phone, facility_type,
        station_status, parent_company, hubspot_station_id, hubspot_contact_id,
        additional_reps, last_synced_at
    ) VALUES (
        p_station_code, p_rep_email, p_rep_name, p_rep_phone, p_facility_type,
        p_station_status, p_parent_company, p_hubspot_station_id, p_hubspot_contact_id,
        p_additional_reps, NOW()
    )
    ON CONFLICT (station_code) DO UPDATE SET
        rep_email = EXCLUDED.rep_email,
        rep_name = EXCLUDED.rep_name,
        rep_phone = EXCLUDED.rep_phone,
        facility_type = EXCLUDED.facility_type,
        station_status = EXCLUDED.station_status,
        parent_company = EXCLUDED.parent_company,
        hubspot_station_id = EXCLUDED.hubspot_station_id,
        hubspot_contact_id = EXCLUDED.hubspot_contact_id,
        additional_reps = EXCLUDED.additional_reps,
        last_synced_at = NOW()
    RETURNING station_rep_mapping.id,
        CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END
    INTO v_id, v_action;
    
    RETURN QUERY SELECT v_id, v_action;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Insert alert log with idempotency
-- ============================================
CREATE OR REPLACE FUNCTION insert_alert_log_idempotent(
    p_alert_id VARCHAR,
    p_idempotency_key VARCHAR,
    p_ticket_number VARCHAR,
    p_station_codes JSONB,
    p_issue_type VARCHAR,
    p_notes_preview TEXT,
    p_states JSONB,
    p_customer_name VARCHAR,
    p_submitter_name VARCHAR,
    p_email_message_id VARCHAR,
    p_received_at TIMESTAMPTZ
)
RETURNS TABLE(id INTEGER, is_duplicate BOOLEAN) AS $$
DECLARE
    v_id INTEGER;
    v_is_duplicate BOOLEAN;
BEGIN
    INSERT INTO alert_log (
        alert_id, idempotency_key, ticket_number, station_codes,
        issue_type, notes_preview, states, customer_name, submitter_name,
        email_message_id, received_at, status
    ) VALUES (
        p_alert_id, p_idempotency_key, p_ticket_number, p_station_codes,
        p_issue_type, p_notes_preview, p_states, p_customer_name, p_submitter_name,
        p_email_message_id, p_received_at, 'new'
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING alert_log.id INTO v_id;
    
    IF v_id IS NULL THEN
        v_is_duplicate := TRUE;
        SELECT alert_log.id INTO v_id FROM alert_log WHERE alert_log.idempotency_key = p_idempotency_key;
    ELSE
        v_is_duplicate := FALSE;
    END IF;
    
    RETURN QUERY SELECT v_id, v_is_duplicate;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grants (adjust as needed for your user)
-- ============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
