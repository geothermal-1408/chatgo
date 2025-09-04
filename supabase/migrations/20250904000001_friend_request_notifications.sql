-- Friend request notification system
-- Create a table to store real-time notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_request_accepted', 'message', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_message TEXT DEFAULT NULL,
    notification_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read = true
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = auth.uid() AND read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced send friend request function with notifications
CREATE OR REPLACE FUNCTION public.send_friend_request(target_username TEXT)
RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
    requesting_user_id UUID;
    requesting_username TEXT;
    notification_id UUID;
BEGIN
    -- Get the requesting user ID
    requesting_user_id := auth.uid();
    IF requesting_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get requesting user's username
    SELECT username INTO requesting_username
    FROM public.profiles
    WHERE id = requesting_user_id;

    -- Get target user ID
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE username = target_username;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if they're already friends
    IF public.are_users_friends(requesting_user_id, target_user_id) THEN
        RAISE EXCEPTION 'Users are already friends';
    END IF;

    -- Check if request already exists
    IF EXISTS (
        SELECT 1 FROM public.user_relationships ur
        WHERE (ur.user_id = requesting_user_id AND ur.target_user_id = target_user_id AND ur.relationship_type = 'friend_request_sent')
        OR (ur.user_id = target_user_id AND ur.target_user_id = requesting_user_id AND ur.relationship_type = 'friend_request_received')
    ) THEN
        RAISE EXCEPTION 'Friend request already exists';
    END IF;

    -- Insert friend request
    INSERT INTO public.user_relationships (user_id, target_user_id, relationship_type)
    VALUES (requesting_user_id, target_user_id, 'friend_request_sent')
    ON CONFLICT (user_id, target_user_id, relationship_type) DO NOTHING;

    -- Insert corresponding received request
    INSERT INTO public.user_relationships (user_id, target_user_id, relationship_type)
    VALUES (target_user_id, requesting_user_id, 'friend_request_received')
    ON CONFLICT (user_id, target_user_id, relationship_type) DO NOTHING;

    -- Create notification for target user
    SELECT public.create_notification(
        target_user_id,
        'friend_request',
        'Friend Request',
        requesting_username || ' sent you a friend request',
        jsonb_build_object('sender_username', requesting_username, 'sender_id', requesting_user_id)
    ) INTO notification_id;

    -- Notify via websocket (this will be handled by the application layer)
    PERFORM pg_notify('friend_request', json_build_object(
        'target_user_id', target_user_id,
        'sender_username', requesting_username,
        'notification_id', notification_id
    )::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced accept friend request function with notifications
CREATE OR REPLACE FUNCTION public.accept_friend_request(sender_username TEXT)
RETURNS VOID AS $$
DECLARE
    sender_user_id UUID;
    accepting_user_id UUID;
    accepting_username TEXT;
    notification_id UUID;
BEGIN
    accepting_user_id := auth.uid();
    IF accepting_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get accepting user's username
    SELECT username INTO accepting_username
    FROM public.profiles
    WHERE id = accepting_user_id;

    -- Get sender user ID
    SELECT id INTO sender_user_id
    FROM public.profiles
    WHERE username = sender_username;

    IF sender_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Remove friend request records
    DELETE FROM public.user_relationships
    WHERE (user_id = accepting_user_id AND target_user_id = sender_user_id AND relationship_type = 'friend_request_received')
    OR (user_id = sender_user_id AND target_user_id = accepting_user_id AND relationship_type = 'friend_request_sent');

    -- Create friend relationship
    INSERT INTO public.user_relationships (user_id, target_user_id, relationship_type)
    VALUES (accepting_user_id, sender_user_id, 'friend');

    INSERT INTO public.user_relationships (user_id, target_user_id, relationship_type)
    VALUES (sender_user_id, accepting_user_id, 'friend');

    -- Create notification for sender
    SELECT public.create_notification(
        sender_user_id,
        'friend_request_accepted',
        'Friend Request Accepted',
        accepting_username || ' accepted your friend request',
        jsonb_build_object('accepter_username', accepting_username, 'accepter_id', accepting_user_id)
    ) INTO notification_id;

    -- Notify via websocket
    PERFORM pg_notify('friend_request_accepted', json_build_object(
        'target_user_id', sender_user_id,
        'accepter_username', accepting_username,
        'notification_id', notification_id
    )::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
