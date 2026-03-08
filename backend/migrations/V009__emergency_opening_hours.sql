ALTER TABLE emergency_services_cache
    ADD COLUMN opening_hours VARCHAR(500) NOT NULL DEFAULT '' AFTER phone;
