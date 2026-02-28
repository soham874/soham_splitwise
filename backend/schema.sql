-- Splitwise Manager – Database & Table Setup
-- This script is idempotent: safe to run on every backend startup.

CREATE DATABASE IF NOT EXISTS `splitwise_manager`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `splitwise_manager`;

CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    splitwise_id    BIGINT        NOT NULL,
    name            VARCHAR(255)  NOT NULL DEFAULT '',
    email           VARCHAR(255)  NOT NULL DEFAULT '',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_splitwise_id (splitwise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trips (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT           NOT NULL,
    created_by      INT           NULL,
    group_id        VARCHAR(64)   NOT NULL,
    name            VARCHAR(255)  NOT NULL DEFAULT '',
    start_date      DATE          NULL,
    end_date        DATE          NULL,
    currencies      VARCHAR(1024) NOT NULL DEFAULT '',
    locations       VARCHAR(2048) NOT NULL DEFAULT '',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_trips_group_id (group_id),
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    INDEX idx_expense_id (expense_id),
    INDEX idx_expenses_user_id (user_id),
    INDEX idx_expenses_trip_user (trip_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
