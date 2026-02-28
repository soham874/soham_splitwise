-- V006: Add start_date column to expenses table for stays
-- date column keeps the original Splitwise entry date untouched.
-- start_date = check-in, end_date = check-out.

USE `splitwise_manager`;

ALTER TABLE expenses ADD COLUMN start_date DATE NULL AFTER date;
