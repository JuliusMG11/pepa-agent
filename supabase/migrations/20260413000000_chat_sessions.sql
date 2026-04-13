-- chat_sessions: stores session metadata (title, timestamps)
CREATE TABLE chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Nový chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_own" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Add rich_blocks to agent_conversations for charts/emails/reports
ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS rich_blocks jsonb;
