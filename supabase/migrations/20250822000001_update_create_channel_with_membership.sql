CREATE OR REPLACE FUNCTION public.create_channel_with_membership(
    channel_name TEXT,
    channel_description TEXT DEFAULT NULL,
    is_private_channel BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    is_private BOOLEAN,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_channel_id UUID;
    user_uuid UUID;
BEGIN
    user_uuid := auth.uid();
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Create channel
    INSERT INTO public.channels (name, description, is_private, created_by)
    VALUES (channel_name, channel_description, is_private_channel, user_uuid)
    RETURNING channels.id INTO new_channel_id;

    -- Add creator membership as owner (ignore duplicate if somehow already exists)
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (new_channel_id, user_uuid, 'owner')
    ON CONFLICT DO NOTHING;

    -- Return the full channel row
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.is_private,
        c.created_by,
        c.created_at,
        c.updated_at
    FROM public.channels c
    WHERE c.id = new_channel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_channel_with_membership(TEXT, TEXT, BOOLEAN) TO authenticated;
