-- migrate:up
ALTER TABLE monitoring_jobs
  ADD COLUMN run_hour smallint NOT NULL DEFAULT 8
    CHECK (run_hour >= 0 AND run_hour <= 23);
