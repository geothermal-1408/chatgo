# Supabase Database Setup for ChatGo

This directory contains the database schema and configuration for the ChatGo application using Supabase.

## Database Schema

The database consists of the following main tables:

### 1. Profiles Table

Extends the built-in `auth.users` table with additional user information:

- `id` (UUID): Primary key, references auth.users
- `username` (TEXT): Unique username for the user
- `email` (TEXT): User's email address
- `avatar_url` (TEXT): URL to user's profile picture
- `display_name` (TEXT): User's display name
- `bio` (TEXT): User's biography/description
- `is_online` (BOOLEAN): Current online status
- `last_seen` (TIMESTAMP): Last time user was active
- `created_at`/`updated_at` (TIMESTAMP): Record timestamps

### 2. Channels Table

Chat channels/rooms:

- `id` (UUID): Primary key
- `name` (TEXT): Channel name
- `description` (TEXT): Channel description
- `is_private` (BOOLEAN): Whether channel is private
- `created_by` (UUID): User who created the channel
- `created_at`/`updated_at` (TIMESTAMP): Record timestamps

### 3. Channel Members Table

Manages user membership in channels:

- `id` (UUID): Primary key
- `channel_id` (UUID): Reference to channel
- `user_id` (UUID): Reference to user profile
- `role` (ENUM): User role in channel (owner, admin, member)
- `joined_at` (TIMESTAMP): When user joined channel

### 4. Messages Table

Chat messages:

- `id` (UUID): Primary key
- `channel_id` (UUID): Reference to channel
- `user_id` (UUID): Reference to user profile
- `content` (TEXT): Message content
- `message_type` (ENUM): Type of message (text, image, file, system)
- `file_url` (TEXT): URL for file attachments
- `reply_to` (UUID): Reference to message being replied to
- `edited` (BOOLEAN): Whether message was edited
- `edited_at` (TIMESTAMP): When message was last edited
- `created_at` (TIMESTAMP): When message was created

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Profiles**: Public viewing, users can only modify their own profile
- **Channels**: Public channels viewable by all, private channels only by members
- **Channel Members**: Only viewable/manageable by channel members and admins
- **Messages**: Only viewable/postable by channel members

### Authentication Triggers

- Automatic profile creation when new users sign up
- Online status management
- Timestamp triggers for updated_at fields

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Wait for the project to be ready

### 2. Environment Variables

1. Copy `.env.example` to `.env` in the client directory
2. Fill in your Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Migrations

You can run the migrations in two ways:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to your Supabase Dashboard > SQL Editor
2. Copy and run the contents of `migrations/20240819000001_initial_schema.sql`
3. Then run `migrations/20240819000002_seed_data.sql`

### 4. Configure Authentication

In your Supabase Dashboard:

1. Go to Authentication > Settings
2. Configure your site URL: `http://localhost:5173` (for development)
3. Add any additional redirect URLs as needed
4. Optionally configure email templates

## Usage in React Application

### 1. Wrap App with AuthProvider

```tsx
import { AuthProvider } from "@/contexts/auth-context";

function App() {
  return <AuthProvider>{/* Your app components */}</AuthProvider>;
}
```

### 2. Use Authentication Hook

```tsx
import { useAuth } from "@/contexts/auth-context";

function MyComponent() {
  const { user, signIn, signOut, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <SignInForm onSignIn={signIn} />;
  }

  return (
    <div>
      <p>Welcome, {user.username}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 3. Database Operations

```tsx
import { supabase } from "@/lib/supabase";

// Fetch user's channels
const { data: channels } = await supabase
  .from("channel_members")
  .select(
    `
    channel:channels (
      id,
      name,
      description
    )
  `
  )
  .eq("user_id", user.id);

// Send a message
const { error } = await supabase.from("messages").insert({
  channel_id: channelId,
  user_id: user.id,
  content: messageContent,
});
```

## Real-time Features

Supabase provides real-time subscriptions for live updates:

```tsx
// Subscribe to new messages in a channel
const subscription = supabase
  .channel("messages")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `channel_id=eq.${channelId}`,
    },
    (payload) => {
      // Handle new message
      console.log("New message:", payload.new);
    }
  )
  .subscribe();

// Clean up subscription
return () => supabase.removeChannel(subscription);
```

## API Functions

The database includes several custom functions:

- `update_user_online_status(user_uuid, online_status)`: Update user's online status
- `handle_new_user()`: Automatically create profile for new auth users
- `handle_updated_at()`: Automatically update timestamp fields

## Best Practices

1. **Always use RLS policies** - Never disable RLS in production
2. **Validate data on client and server** - Use database constraints and client validation
3. **Handle errors gracefully** - Wrap database calls in try-catch blocks
4. **Use TypeScript types** - Leverage the generated Database types
5. **Optimize queries** - Use indexes and avoid N+1 queries
6. **Monitor usage** - Keep an eye on database usage in Supabase Dashboard

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Make sure your policies allow the operation you're trying to perform
2. **Type Errors**: Ensure your Database interface matches your actual schema
3. **Authentication Errors**: Check that users are properly authenticated before database operations
4. **Migration Errors**: Run migrations in order and check for conflicts

### Useful SQL Queries

```sql
-- Check user profiles
SELECT * FROM profiles WHERE username = 'your_username';

-- Check channel membership
SELECT u.username, c.name, cm.role
FROM channel_members cm
JOIN profiles u ON u.id = cm.user_id
JOIN channels c ON c.id = cm.channel_id;

-- Check recent messages
SELECT m.content, u.username, c.name, m.created_at
FROM messages m
JOIN profiles u ON u.id = m.user_id
JOIN channels c ON c.id = m.channel_id
ORDER BY m.created_at DESC
LIMIT 10;
```
