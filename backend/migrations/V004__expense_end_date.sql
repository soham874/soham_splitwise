-- V004: Add optional end_date to expenses table
-- For stays (hotels, hostels), end_date is check-out.

USE `splitwise_manager`;

ALTER TABLE expenses ADD COLUMN end_date DATE NULL AFTER date;
