-- Create chat-related tables

-- Chat rooms for organizing conversations
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'support' CHECK (type IN ('support', 'booking', 'general')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat room participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('admin', 'participant', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB, -- For storing file info, reactions, etc.
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File attachments for chat
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS chat_typing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Message reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Chat room settings
CREATE TABLE IF NOT EXISTS chat_room_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE UNIQUE,
  allow_file_uploads BOOLEAN DEFAULT true,
  max_file_size INTEGER DEFAULT 10485760, -- 10MB
  allowed_file_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  message_retention_days INTEGER DEFAULT 365,
  auto_close_after_hours INTEGER DEFAULT 72,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_is_active ON chat_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_room_id ON chat_typing(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp 
      WHERE cp.room_id = chat_rooms.id 
      AND cp.user_id IN (
        SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
      )
      AND cp.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

CREATE POLICY "Room creators and admins can update rooms" ON chat_rooms
  FOR UPDATE USING (
    created_by IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2 
      WHERE cp2.room_id = chat_participants.room_id 
      AND cp2.user_id IN (
        SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
      )
      AND cp2.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can join rooms" ON chat_participants
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp 
      WHERE cp.room_id = chat_messages.room_id 
      AND cp.user_id IN (
        SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
      )
      AND cp.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can send messages to their rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM chat_participants cp 
      WHERE cp.room_id = chat_messages.room_id 
      AND cp.user_id = chat_messages.sender_id
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE USING (
    sender_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for other tables follow similar patterns...

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at 
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_room_settings_updated_at ON chat_room_settings;
CREATE TRIGGER update_chat_room_settings_updated_at 
    BEFORE UPDATE ON chat_room_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add room creator as participant
CREATE OR REPLACE FUNCTION add_room_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_participants (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  -- Create default room settings
  INSERT INTO chat_room_settings (room_id)
  VALUES (NEW.id)
  ON CONFLICT (room_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add creator as participant
DROP TRIGGER IF EXISTS add_creator_as_participant ON chat_rooms;
CREATE TRIGGER add_creator_as_participant
    AFTER INSERT ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION add_room_creator_as_participant();

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove typing indicators older than 5 minutes
  DELETE FROM chat_typing 
  WHERE started_at < NOW() - INTERVAL '5 minutes';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up typing indicators
DROP TRIGGER IF EXISTS cleanup_old_typing ON chat_typing;
CREATE TRIGGER cleanup_old_typing
    AFTER INSERT ON chat_typing
    FOR EACH STATEMENT EXECUTE FUNCTION cleanup_typing_indicators();