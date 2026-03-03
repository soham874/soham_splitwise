CREATE TABLE IF NOT EXISTS location_coords (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    lat          DECIMAL(10, 7) NULL,
    lon          DECIMAL(10, 7) NULL,
    display_name VARCHAR(500) NOT NULL DEFAULT '',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_location_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
