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
    group_id        VARCHAR(64)   NOT NULL,
    name            VARCHAR(255)  NOT NULL DEFAULT '',
    start_date      DATE          NULL,
    end_date        DATE          NULL,
    currencies      VARCHAR(1024) NOT NULL DEFAULT '',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_id (user_id),
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
