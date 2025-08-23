# ChatGo

A real-time chat application built with React, Go, and Supabase that enables instant messaging with WebSocket connectivity and user authentication.

## Architecture

ChatGo follows a modern full-stack architecture with clear separation of concerns:

- **Frontend**: React with TypeScript, Vite, and Tailwind CSS
- **Backend**: Go WebSocket server for real-time communication
- **Database**: Supabase (PostgreSQL) for user management and data persistence
- **Authentication**: Supabase Auth with email/password signup

## Features

- Real-time messaging via WebSocket connections
- User authentication and profiles
- Channel-based chat organization
- Online status indicators
- Message history persistence
- Rate limiting and moderation features
- Responsive design with Tailwind CSS

## Project Structure

```
chatgo/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components (auth, chat, ui)
│   │   ├── contexts/       # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Go WebSocket server
│   ├── chat.go            # Main server implementation
│   └── go.mod             # Go dependencies
└── supabase/              # Database schema and migrations
    └── migrations/        # SQL migration files
```

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation
- **Supabase Client** for database operations

### Backend

- **Go 1.21** with Gorilla WebSocket
- Real-time message broadcasting
- Connection management and rate limiting

### Database

- **Supabase** (PostgreSQL)
- User profiles and authentication
- Channels and message storage
- Row Level Security (RLS) policies

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Go 1.21+
- Supabase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/geothermal-1408/chatgo.git
   cd chatgo
   ```

2. **Set up the frontend**

   ```bash
   cd client
   npm install
   ```

3. **Set up the backend**

   ```bash
   cd server
   go mod tidy
   ```

4. **Configure Supabase**
   - Create a new Supabase project
   - Update `supabase/config.toml` with your project ID
   - Run migrations to set up the database schema

### Development

1. **Start the Go WebSocket server**

   ```bash
   cd server
   go run chat.go
   ```

2. **Start the React development server**

   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   - Frontend: `http://localhost:5173`
   - WebSocket server: `ws://localhost:8000`

## Database Schema

The application uses a structured PostgreSQL schema with:

- **profiles**: User information extending Supabase auth
- **channels**: Chat rooms and channel metadata
- **messages**: Chat message storage with type support
- **channel_members**: User-channel relationships with roles

## Disclaimer

** This is not ready yet **

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the terms specified in the LICENSE file.
