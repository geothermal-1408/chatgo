-- Insert sample data for testing
-- Note: This should only be run after the initial schema migration

-- Insert sample channels (these will be created after users are registered)
INSERT INTO public.channels (name, description, is_private, created_by) VALUES
  ('general', 'General discussion for everyone', false, (SELECT id FROM auth.users LIMIT 1)),
  ('random', 'Random chatter and off-topic discussions', false, (SELECT id FROM auth.users LIMIT 1)),
  ('announcements', 'Important announcements and updates', false, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Note: User profiles will be automatically created via the trigger when users sign up
-- Message data will be created through the application
