-- Add direct message functionality
-- This migration creates the infrastructure for private messages between friends

-- Create a direct_messages table for one-on-one conversations
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    participant2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure participants are different and maintain consistent ordering
    CONSTRAINT different_participants CHECK (participant1_id != participant2_id),
    CONSTRAINT ordered_participants CHECK (participant1_id < participant2_id),
    UNIQUE(participant1_id, participant2_id)
);

-- Create direct message messages table
CREATE TABLE IF NOT EXISTS public.dm_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    file_url TEXT,
    reply_to UUID REFERENCES public.dm_messages(id) ON DELETE SET NULL,
    edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    read_by_recipient BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_participant1 ON public.direct_messages(participant1_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_participant2 ON public.direct_messages(participant2_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_last_message_at ON public.direct_messages(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_dm_id ON public.dm_messages(dm_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_id ON public.dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON public.dm_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_messages_read_by_recipient ON public.dm_messages(read_by_recipient) WHERE read_by_recipient = false;

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for direct_messages
CREATE POLICY "Users can view their own DMs" ON public.direct_messages
    FOR SELECT USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create DMs with friends" ON public.direct_messages
    FOR INSERT WITH CHECK (
        (participant1_id = auth.uid() OR participant2_id = auth.uid()) AND
        public.are_users_friends(participant1_id, participant2_id)
    );

CREATE POLICY "Participants can update their DMs" ON public.direct_messages
    FOR UPDATE USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- RLS policies for dm_messages
CREATE POLICY "DM participants can view messages" ON public.dm_messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.direct_messages dm 
        WHERE dm.id = dm_messages.dm_id 
        AND (dm.participant1_id = auth.uid() OR dm.participant2_id = auth.uid())
    ));

CREATE POLICY "DM participants can send messages" ON public.dm_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.direct_messages dm 
            WHERE dm.id = dm_messages.dm_id 
            AND (dm.participant1_id = auth.uid() OR dm.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Message senders can update their messages" ON public.dm_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Message senders can delete their messages" ON public.dm_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Function to get or create a DM conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_dm(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    dm_id UUID;
    participant1 UUID;
    participant2 UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Ensure users are friends
    IF NOT public.are_users_friends(current_user_id, target_user_id) THEN
        RAISE EXCEPTION 'Users must be friends to send direct messages';
    END IF;

    -- Order the participants consistently (smaller UUID first)
    IF current_user_id < target_user_id THEN
        participant1 := current_user_id;
        participant2 := target_user_id;
    ELSE
        participant1 := target_user_id;
        participant2 := current_user_id;
    END IF;

    -- Try to find existing DM
    SELECT id INTO dm_id
    FROM public.direct_messages
    WHERE participant1_id = participant1 AND participant2_id = participant2;

    -- Create new DM if it doesn't exist
    IF dm_id IS NULL THEN
        INSERT INTO public.direct_messages (participant1_id, participant2_id)
        VALUES (participant1, participant2)
        RETURNING id INTO dm_id;
    END IF;

    RETURN dm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get DM conversations for a user
CREATE OR REPLACE FUNCTION public.get_user_dm_conversations(user_uuid UUID)
RETURNS TABLE (
    dm_id UUID,
    other_user_id UUID,
    other_user_username TEXT,
    other_user_display_name TEXT,
    other_user_avatar_url TEXT,
    other_user_is_online BOOLEAN,
    other_user_status TEXT,
    last_message_content TEXT,
    last_message_sender_id UUID,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id as dm_id,
        CASE 
            WHEN dm.participant1_id = user_uuid THEN dm.participant2_id
            ELSE dm.participant1_id
        END as other_user_id,
        p.username as other_user_username,
        p.display_name as other_user_display_name,
        p.avatar_url as other_user_avatar_url,
        p.is_online as other_user_is_online,
        p.status as other_user_status,
        latest_msg.content as last_message_content,
        latest_msg.sender_id as last_message_sender_id,
        dm.last_message_at,
        COALESCE(unread.unread_count, 0) as unread_count
    FROM public.direct_messages dm
    INNER JOIN public.profiles p ON (
        p.id = CASE 
            WHEN dm.participant1_id = user_uuid THEN dm.participant2_id
            ELSE dm.participant1_id
        END
    )
    LEFT JOIN LATERAL (
        SELECT content, sender_id, created_at
        FROM public.dm_messages msg
        WHERE msg.dm_id = dm.id
        ORDER BY msg.created_at DESC
        LIMIT 1
    ) latest_msg ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as unread_count
        FROM public.dm_messages msg
        WHERE msg.dm_id = dm.id
        AND msg.sender_id != user_uuid
        AND msg.read_by_recipient = false
    ) unread ON true
    WHERE dm.participant1_id = user_uuid OR dm.participant2_id = user_uuid
    ORDER BY dm.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_dm_messages_read(dm_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verify user is a participant in this DM
    IF NOT EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE id = dm_conversation_id 
        AND (participant1_id = current_user_id OR participant2_id = current_user_id)
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Mark messages as read
    UPDATE public.dm_messages
    SET read_by_recipient = true, read_at = NOW()
    WHERE dm_id = dm_conversation_id
    AND sender_id != current_user_id
    AND read_by_recipient = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_message_at when a new DM is sent
CREATE OR REPLACE FUNCTION public.update_dm_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.direct_messages
    SET last_message_at = NEW.created_at, updated_at = NOW()
    WHERE id = NEW.dm_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_dm_last_message_at_trigger
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_dm_last_message_at();

-- Update trigger for direct_messages
CREATE OR REPLACE TRIGGER set_updated_at_direct_messages
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
