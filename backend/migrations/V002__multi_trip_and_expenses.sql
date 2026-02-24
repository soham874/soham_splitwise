-- V002: Support multiple trips per user + add expenses table
--
-- 1. Remove UNIQUE constraint on trips.user_id (drop FK first, then unique
--    index, add regular index, re-add FK).
-- 2. Create expenses table.

USE `splitwise_manager`;

-- Step 1a: Drop the foreign key that depends on the unique index
ALTER TABLE trips DROP FOREIGN KEY fk_trips_user;

-- Step 1b: Drop the unique index
ALTER TABLE trips DROP INDEX uq_user_id;

-- Step 1c: Add a regular (non-unique) index
ALTER TABLE trips ADD INDEX idx_user_id (user_id);

-- Step 1d: Re-add the foreign key
ALTER TABLE trips ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id);

-- Step 2: Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    trip_id         VARCHAR(64)   NOT NULL COMMENT 'Splitwise group_id',
    user_id         BIGINT        NOT NULL COMMENT 'Splitwise user_id',
    expense_id      VARCHAR(64)   NULL     COMMENT 'Splitwise expense_id, NULL if solo',
    location        VARCHAR(255)  NOT NULL DEFAULT '',
    category        VARCHAR(255)  NOT NULL DEFAULT '',
    description     VARCHAR(512)  NOT NULL DEFAULT '',
    amount_inr      DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Owed amount in INR',
    currency_code   VARCHAR(10)   NOT NULL DEFAULT 'INR',
    original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Owed amount in original currency',
    date            DATE          NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_trip_id (trip_id),
    INDEX idx_expense_id (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
