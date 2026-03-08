CREATE TABLE IF NOT EXISTS emergency_services_cache (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    location     VARCHAR(255) NOT NULL,
    category     VARCHAR(50)  NOT NULL,
    name         VARCHAR(500) NOT NULL DEFAULT '',
    address      VARCHAR(500) NOT NULL DEFAULT '',
    phone        VARCHAR(255) NOT NULL DEFAULT '',
    lat          DECIMAL(10, 7) NULL,
    lon          DECIMAL(10, 7) NULL,
    osm_id       BIGINT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_es_location (location),
    INDEX idx_es_location_category (location, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
