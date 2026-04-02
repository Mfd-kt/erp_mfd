-- Tâches : heure de fin (liée à end_date, optionnelle)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS end_time time;

COMMENT ON COLUMN tasks.end_time IS 'Heure associée à end_date (optionnelle).';
