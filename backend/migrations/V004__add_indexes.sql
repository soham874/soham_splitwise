-- V004: Add indexes for common query patterns

USE `splitwise_manager`;

-- trips: group_id
CREATE INDEX idx_trips_group_id ON trips (group_id);

-- expenses: user_id
CREATE INDEX idx_expenses_user_id ON expenses (user_id);

-- expenses: composite (trip_id, user_id) for get_user_expenses_by_trip
CREATE INDEX idx_expenses_trip_user ON expenses (trip_id, user_id);
