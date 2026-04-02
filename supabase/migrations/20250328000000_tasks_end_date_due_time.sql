-- Tâches : date de fin + heure d’échéance optionnelle
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS due_time time;

COMMENT ON COLUMN tasks.end_date IS 'Date de fin de tâche (optionnelle).';
COMMENT ON COLUMN tasks.due_time IS 'Heure associée à l’échéance due_date (optionnelle).';
