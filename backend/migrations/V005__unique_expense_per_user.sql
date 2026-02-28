-- V005: Unique constraint on (trip_id, expense_id, user_id) for upsert support

USE `splitwise_manager`;

UPDATE expenses SET expense_id = '' WHERE expense_id IS NULL;

ALTER TABLE expenses MODIFY expense_id VARCHAR(64) NOT NULL DEFAULT '';

DELETE e1 FROM expenses e1
INNER JOIN expenses e2
  ON e1.trip_id = e2.trip_id
  AND e1.expense_id = e2.expense_id
  AND e1.user_id = e2.user_id
  AND e1.id > e2.id;

CREATE UNIQUE INDEX uq_trip_expense_user ON expenses (trip_id, expense_id, user_id);
