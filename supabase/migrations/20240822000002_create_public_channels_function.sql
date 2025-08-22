-- Function to get public channels (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.get_public_channels()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    is_private BOOLEAN,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.name,
        c.description,
        c.is_private,
        c.created_by,
        c.created_at,
        c.updated_at
    FROM public.channels c
    WHERE c.is_private = false
    ORDER BY c.created_at ASC;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_channels() TO anon, authenticated;
