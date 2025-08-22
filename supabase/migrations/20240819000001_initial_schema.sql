-- Enable Row Level Security

/* deleted due to no longer superuser support
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'jwt-secret';
*/
-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    display_name TEXT,
    bio TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT channel_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50)
);

-- Create channel_members table
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role user_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(channel_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    file_url TEXT,
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Public channels are viewable by everyone" ON public.channels;
DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.channels;
DROP POLICY IF EXISTS "Channel owners can update their channels" ON public.channels;
DROP POLICY IF EXISTS "Channel owners can delete their channels" ON public.channels;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view memberships of public channels" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON public.channel_members;
DROP POLICY IF EXISTS "Channel owners can manage all memberships" ON public.channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON public.channel_members;
DROP POLICY IF EXISTS "Channel members can view channel membership" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can manage membership" ON public.channel_members;

DROP POLICY IF EXISTS "Channel members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Channel members can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Message authors can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Message authors can delete their messages" ON public.messages;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for channels
CREATE POLICY "Public channels are viewable by everyone" ON public.channels
    FOR SELECT USING (NOT is_private OR EXISTS (
        SELECT 1 FROM public.channel_members 
        WHERE channel_id = channels.id AND user_id = auth.uid()
    ));

CREATE POLICY "Authenticated users can create channels" ON public.channels
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR created_by = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Channel owners can update their channels" ON public.channels
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Channel owners can delete their channels" ON public.channels
    FOR DELETE USING (created_by = auth.uid());

-- Create RLS policies for channel_members
CREATE POLICY "Users can view their own memberships" ON public.channel_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships of public channels" ON public.channel_members
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.channels 
        WHERE id = channel_members.channel_id AND is_private = false
    ));

CREATE POLICY "Users can join public channels" ON public.channel_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.channels 
            WHERE id = channel_members.channel_id AND is_private = false
        )
    );

CREATE POLICY "Channel owners can manage all memberships" ON public.channel_members
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.channels 
        WHERE id = channel_members.channel_id AND created_by = auth.uid()
    ));

CREATE POLICY "Users can leave channels" ON public.channel_members
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for messages
CREATE POLICY "Channel members can view messages" ON public.messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.channel_members 
        WHERE channel_id = messages.channel_id AND user_id = auth.uid()
    ));

CREATE POLICY "Channel members can insert messages" ON public.messages
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.channel_members 
        WHERE channel_id = messages.channel_id AND user_id = auth.uid()
    ) AND user_id = auth.uid());

CREATE POLICY "Message authors can update their messages" ON public.messages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Message authors can delete their messages" ON public.messages
    FOR DELETE USING (user_id = auth.uid());

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_channels
    BEFORE UPDATE ON public.channels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_online_status(user_uuid UUID, online_status BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        is_online = online_status,
        last_seen = CASE WHEN online_status = false THEN NOW() ELSE last_seen END
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

