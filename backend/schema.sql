-- Run once in the Neon SQL Editor on Petio's dedicated database/branch.
-- This small friends-only beta stores its bounded state in one locked row.
CREATE TABLE IF NOT EXISTS petio_state (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO petio_state (id, data)
VALUES (1, '{"users":{},"rooms":{},"visits":{},"limits":{}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
