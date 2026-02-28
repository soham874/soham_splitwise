-- V004: Add indexes for common query patterns
--
-- 1. users.splitwise_id  – explicit ASC index (UNIQUE already exists; this is a no-op
--    reminder; the unique key already serves as an index, so we skip re-creating it).
-- 2. trips.group_id      – used in delete_trip, expense sync lookups.
-- 3. expenses.user_id    – used in get_user_expenses_by_trip.
-- 4. expenses(trip_id, user_id) – composite for per-user-per-trip queries.

USE `splitwise_manager`;

-- trips: group_id
CREATE INDEX idx_trips_group_id ON trips (group_id);

-- expenses: user_id
CREATE INDEX idx_expenses_user_id ON expenses (user_id);

-- expenses: composite (trip_id, user_id) for get_user_expenses_by_trip
CREATE INDEX idx_expenses_trip_user ON expenses (trip_id, user_id);
