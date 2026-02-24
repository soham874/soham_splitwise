-- V003: Add created_by column to trips table
-- Tracks which user originally created the trip so only they can edit/delete.

USE `splitwise_manager`;

ALTER TABLE trips ADD COLUMN created_by INT NULL AFTER user_id;

-- Backfill: for existing rows, assume the trip owner is the creator
UPDATE trips SET created_by = user_id WHERE created_by IS NULL;
