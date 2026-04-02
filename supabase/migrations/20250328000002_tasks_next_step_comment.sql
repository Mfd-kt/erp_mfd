-- Tâches : commentaire « étape suivante » (surtout pour En cours / Terminé)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS next_step_comment text;

COMMENT ON COLUMN tasks.next_step_comment IS 'Prochaine étape ou commentaire (ex. après passage en cours ou terminé).';
