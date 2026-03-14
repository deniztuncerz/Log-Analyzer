-- MPLUS Log Analyzer — PostgreSQL Database Schema
-- Bu script Docker container ilk başlatıldığında otomatik çalışır.

-- Cihazlar tablosu
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(20) UNIQUE NOT NULL,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

-- Log dosya kayıtları
CREATE TABLE IF NOT EXISTS log_files (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    filename VARCHAR(255) NOT NULL,
    kw_limit INTEGER NOT NULL DEFAULT 7200,
    date_range VARCHAR(30),
    total_events INTEGER DEFAULT 0,
    total_data_rows INTEGER DEFAULT 0,
    fault_count INTEGER DEFAULT 0,
    warn_count INTEGER DEFAULT 0,
    deep_discharge_count INTEGER DEFAULT 0,
    status VARCHAR(10) DEFAULT 'normal',
    raw_content TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, filename)
);

-- Olay günlüğü kayıtları
CREATE TABLE IF NOT EXISTS event_logs (
    id SERIAL PRIMARY KEY,
    log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
    timestamp VARCHAR(14),
    month INTEGER,
    day INTEGER,
    hour INTEGER,
    minute INTEGER,
    mode INTEGER,
    flags TEXT,
    fault_code VARCHAR(4),
    severity VARCHAR(5)
);

-- Veri günlüğü kayıtları
CREATE TABLE IF NOT EXISTS data_logs (
    id SERIAL PRIMARY KEY,
    log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
    timestamp VARCHAR(14),
    month INTEGER,
    day INTEGER,
    hour INTEGER,
    minute INTEGER,
    mode INTEGER,
    pv_voltage REAL,
    pv_power REAL,
    grid_voltage REAL,
    grid_frequency REAL,
    output_voltage REAL,
    output_power REAL,
    output_frequency REAL,
    load_percent REAL,
    battery_voltage REAL,
    battery_capacity REAL
);

-- Analiz sonuçları
CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
    min_bat_v REAL,
    max_bat_v REAL,
    min_bat_cap REAL,
    min_grid_v REAL,
    max_grid_v REAL,
    min_grid_hz REAL,
    max_grid_hz REAL,
    max_output_w REAL,
    max_pv_v REAL,
    zero_count INTEGER,
    fc_count_map JSONB,
    limit_violations JSONB,
    rca_results JSONB,
    analyzed_at TIMESTAMP DEFAULT NOW()
);

-- Teknik servis notları
CREATE TABLE IF NOT EXISTS tech_notes (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_event_logs_file ON event_logs(log_file_id);
CREATE INDEX IF NOT EXISTS idx_data_logs_file ON data_logs(log_file_id);
CREATE INDEX IF NOT EXISTS idx_log_files_device ON log_files(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
