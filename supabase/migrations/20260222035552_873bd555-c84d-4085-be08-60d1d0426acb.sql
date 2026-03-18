
-- Add unique constraint on weekly_updates (user_id, week_start) to prevent duplicate submissions
ALTER TABLE public.weekly_updates ADD CONSTRAINT weekly_updates_user_week_unique UNIQUE (user_id, week_start);
