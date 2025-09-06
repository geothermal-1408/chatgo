-- Update the get_user_dm_conversations function to include last message read status
-- This migration enhances the DM conversations view to show read status for better UX

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_dm_conversations(UUID);

-- Recreate the function with last message read status
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
    last_message_read_by_recipient BOOLEAN,
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
        latest_msg.read_by_recipient as last_message_read_by_recipient,
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
        SELECT content, sender_id, read_by_recipient, created_at
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
