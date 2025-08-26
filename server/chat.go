package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

const port = "8000"

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

type MessageType int
const (
	ClientConnected MessageType = iota+1
	ClientDisconnected
	NewMessage
	UserJoined
	UserLeft
	UserList
)

// Incoming raw message wrapper
type Message struct {
	Type     MessageType
	Conn     *websocket.Conn
	Text     string
	Username string
	UserID   string
}

// Each connected client
type Client struct {
	Conn       *websocket.Conn
	Username   string
	ChannelID  string        // ✅ FIX: Track which channel the client is in
	UserID     string        // Supabase auth user id
	Token      string        // Access token (validated)
}

// WebSocket JSON format
type WSMessage struct {
	Type      string   `json:"type"`
	Username  string   `json:"username,omitempty"`
	Content   string   `json:"content,omitempty"`
	Channel   string   `json:"channel,omitempty"`   // ✅ FIX: Added channel field
	Users     []string `json:"users,omitempty"`
	Timestamp string   `json:"timestamp,omitempty"` // ✅ FIX: Added timestamp field
	ID        string   `json:"id,omitempty"`        // ✅ FIX: Added ID field
}

// generateID creates a random ID string similar to client-side generation
func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, 13)
	for i := range result {
		result[i] = chars[rand.Intn(len(chars))]
	}
	return string(result)
}

func server(messages chan Message, sb *SupabaseClient) {
	clients := map[string]*Client{}

	// getUserList := func(channelID string) []string {
	// 	// ✅ FIX: Return users only for the given channel
	// 	users := []string{}
	// 	for _, client := range clients {
	// 		if client.Username != "" && client.ChannelID == channelID {
	// 			users = append(users, client.Username)
	// 		}
	// 	}
	// 	return users
	// }

	for {
		msg := <-messages
		switch msg.Type {
		case ClientConnected:
			addr := msg.Conn.RemoteAddr().String()

			// Connection should already be authenticated in handleWebSocket and user info stored in context
			// For simplicity, we do token validation here using query params (since no context passing)
			q := msg.Conn.RemoteAddr().String()
			_ = q // placeholder (not used)

			// Check if this is a reconnection (same IP)
			if existingClient := clients[addr]; existingClient != nil {
				log.Printf("\x1b[33mINFO\x1b[0m: client %s reconnecting, cleaning up old connection\n", addr)
				existingClient.Conn.Close()
			}

			clients[addr] = &Client{Conn: msg.Conn, Username: msg.Username, UserID: msg.UserID}
			log.Printf("\x1b[32mINFO\x1b[0m: connected to server: %s user=%s id=%s\n", addr, msg.Username, msg.UserID)

		case ClientDisconnected:
			fullAddr := msg.Conn.RemoteAddr().String()
			client, exists := clients[fullAddr]
			if exists && client.Username != "" {
				leaveMsg := WSMessage{
					Type: "user_left",
					Username: client.Username,
					Channel: client.ChannelID, // ✅ FIX: include channel
					Timestamp: time.Now().Format(time.RFC3339), // ✅ FIX: Add timestamp
					ID: generateID(), // ✅ FIX: Add ID
				}
				jsonMsg, _ := json.Marshal(leaveMsg)

				// ✅ FIX: Notify only same-channel clients
				for _, otherClient := range clients {
					if otherClient != client && otherClient.ChannelID == client.ChannelID {
						otherClient.Conn.WriteMessage(websocket.TextMessage, jsonMsg)
					}
				}
				log.Printf("\x1b[32mINFO\x1b[0m: user %s left channel %s\n", client.Username, client.ChannelID)
			}
			delete(clients, fullAddr)

		case NewMessage:
			authorAddr := msg.Conn.RemoteAddr().String()

			author, exists := clients[authorAddr]
			if !exists {
				continue
			}

			// ✅ FIX: Parse JSON instead of raw text
			var wsMsg WSMessage
			if err := json.Unmarshal([]byte(msg.Text), &wsMsg); err != nil {
				log.Println("Invalid message format:", err)
				continue
			}

			if wsMsg.Type == "switch_channel" {
                log.Printf("user %s switched from %s to %s\n",
                    author.Username, author.ChannelID, wsMsg.Channel)
                
                // Notify old channel that user left
                if author.ChannelID != "" {
                    leaveMsg := WSMessage{
                        Type: "user_left",
                        Username: author.Username,
                        Channel: author.ChannelID,
                        Timestamp: time.Now().Format(time.RFC3339), // ✅ FIX: Add timestamp
                        ID: generateID(), // ✅ FIX: Add ID
                    }
                    jsonLeaveMsg, _ := json.Marshal(leaveMsg)
                    for _, client := range clients {
                        if client != author && client.ChannelID == author.ChannelID {
                            client.Conn.WriteMessage(websocket.TextMessage, jsonLeaveMsg)
                        }
                    }
                }
                
                // Update user's channel
                author.ChannelID = wsMsg.Channel
                
                // Get existing users in new channel (excluding current user)
                existingUsers := []string{}
                for _, client := range clients {
                    if client.Username != "" && client.ChannelID == wsMsg.Channel && client != author {
                        existingUsers = append(existingUsers, client.Username)
                    }
                }
                
                // Send user list to switching user
                if len(existingUsers) > 0 {
                    listMsg := WSMessage{
                        Type: "user_list",
                        Users: existingUsers,
                        Channel: wsMsg.Channel,
                    }
                    listJsonMsg, _ := json.Marshal(listMsg)
                    author.Conn.WriteMessage(websocket.TextMessage, listJsonMsg)
                }
                
                // ✅ FIX: Send message history to switching user
				messages, err := sb.GetChannelMessages(wsMsg.Channel, 50)
				if err != nil {
					log.Printf("\x1b[33mWARN\x1b[0m: failed to fetch message history for channel %s: %v", wsMsg.Channel, err)
				} else if len(messages) > 0 {
					// Get all unique user IDs from messages
					userIDs := make(map[string]bool)
					for _, msg := range messages {
						userIDs[msg.UserID] = true
					}
					
					// Convert to slice
					userIDList := make([]string, 0, len(userIDs))
					for userID := range userIDs {
						userIDList = append(userIDList, userID)
					}
					
					// Get usernames for all users
					usernames, err := sb.GetProfiles(userIDList)
					if err != nil {
						log.Printf("\x1b[33mWARN\x1b[0m: failed to fetch usernames for message history: %v", err)
						usernames = make(map[string]string) // fallback to empty map
					}
					
					// Send each message as a history message
					for _, msg := range messages {
						username := usernames[msg.UserID]
						if username == "" {
							username = "unknown"
						}
						
						historyMsg := WSMessage{
							Type: "message",
							Username: username,
							Content: msg.Content,
							Channel: wsMsg.Channel,
							Timestamp: msg.CreatedAt,
							ID: msg.ID,
						}
						historyJsonMsg, _ := json.Marshal(historyMsg)
						author.Conn.WriteMessage(websocket.TextMessage, historyJsonMsg)
					}
					
					log.Printf("\x1b[32mINFO\x1b[0m: sent %d historical messages to %s switching to channel %s", len(messages), author.Username, wsMsg.Channel)
				}
                
                // Notify new channel that user joined
                joinMsg := WSMessage{
                    Type: "user_joined",
                    Username: author.Username,
                    Channel: wsMsg.Channel,
                    Timestamp: time.Now().Format(time.RFC3339), // ✅ FIX: Add timestamp
                    ID: generateID(), // ✅ FIX: Add ID
                }
                jsonJoinMsg, _ := json.Marshal(joinMsg)
                for _, client := range clients {
                    if client != author && client.ChannelID == wsMsg.Channel {
                        client.Conn.WriteMessage(websocket.TextMessage, jsonJoinMsg)
                    }
                }
                
                continue
            }

			// Handle typing events without rate limiting
			if wsMsg.Type == "typing" || wsMsg.Type == "stop_typing" {
				// Broadcast typing events to same channel only
				for _, client := range clients {
					if client != author && client.ChannelID == wsMsg.Channel {
						client.Conn.WriteJSON(wsMsg)
					}
				}
				continue
			}

			// Handle join messages (channel join only; username enforced server-side)
			if wsMsg.Type == "join" {
				if author.Username == "" {
					log.Printf("\x1b[31mERROR\x1b[0m: author with empty username tried to join")
					continue
				}
				author.ChannelID = wsMsg.Channel
				// Get current user list BEFORE adding the new user
				existingUsers := []string{}
				for _, client := range clients {
					if client.Username != "" && client.ChannelID == wsMsg.Channel && client != author {
						existingUsers = append(existingUsers, client.Username)
					}
				}
				
				// Send existing user list to new user (excluding themselves)
				if len(existingUsers) > 0 {
					listMsg := WSMessage{
						Type: "user_list",
						Users: existingUsers,
						Channel: wsMsg.Channel,
					}
					listJsonMsg, _ := json.Marshal(listMsg)
					author.Conn.WriteMessage(websocket.TextMessage, listJsonMsg)
				}
				
				// ✅ FIX: Send message history to new user
				messages, err := sb.GetChannelMessages(wsMsg.Channel, 50)
				if err != nil {
					log.Printf("\x1b[33mWARN\x1b[0m: failed to fetch message history for channel %s: %v", wsMsg.Channel, err)
				} else if len(messages) > 0 {
					// Get all unique user IDs from messages
					userIDs := make(map[string]bool)
					for _, msg := range messages {
						userIDs[msg.UserID] = true
					}
					
					// Convert to slice
					userIDList := make([]string, 0, len(userIDs))
					for userID := range userIDs {
						userIDList = append(userIDList, userID)
					}
					
					// Get usernames for all users
					usernames, err := sb.GetProfiles(userIDList)
					if err != nil {
						log.Printf("\x1b[33mWARN\x1b[0m: failed to fetch usernames for message history: %v", err)
						usernames = make(map[string]string) // fallback to empty map
					}
					
					// Send each message as a history message
					for _, msg := range messages {
						username := usernames[msg.UserID]
						if username == "" {
							username = "unknown"
						}
						
						historyMsg := WSMessage{
							Type: "message",
							Username: username,
							Content: msg.Content,
							Channel: wsMsg.Channel,
							Timestamp: msg.CreatedAt,
							ID: msg.ID,
						}
						historyJsonMsg, _ := json.Marshal(historyMsg)
						author.Conn.WriteMessage(websocket.TextMessage, historyJsonMsg)
					}
					
					log.Printf("\x1b[32mINFO\x1b[0m: sent %d historical messages to %s for channel %s", len(messages), author.Username, wsMsg.Channel)
				}
				
				// Notify others in the same channel that this user joined
				joinMsg := WSMessage{
					Type: "user_joined",
					Username: author.Username,
					Channel: wsMsg.Channel,
					Timestamp: time.Now().Format(time.RFC3339),
					ID: generateID(),
				}
				jsonMsg, _ := json.Marshal(joinMsg)
				for _, client := range clients {
					if client != author && client.ChannelID == wsMsg.Channel {
						client.Conn.WriteMessage(websocket.TextMessage, jsonMsg)
					}
				}

				log.Printf("\x1b[32mINFO\x1b[0m: user %s joined channel %s\n", wsMsg.Username, wsMsg.Channel)
				continue // Don't process as regular message
			}

			// ✅ FIX: Only allow sending to same channel
			// Skip empty messages
			if strings.TrimSpace(wsMsg.Content) == "" {
				continue
			}
			
			// Ensure an ID for broadcast (not persisted as DB ID)
			if wsMsg.ID == "" { wsMsg.ID = generateID() }

			if author.UserID == "" {
				log.Printf("\x1b[31mERROR\x1b[0m: missing user id on author; skipping message persist")
				continue
			}
			// Persist to Supabase (best-effort with retries)
			dbMsg, err := sb.InsertMessage(wsMsg.Channel, author.UserID, wsMsg.Content)
			if err != nil {
				log.Printf("\x1b[31mERROR\x1b[0m: failed to persist message: %v\n", err)
				// Optionally send error back only to author
				errPayload := WSMessage{Type: "error", Content: "failed_to_persist", Channel: wsMsg.Channel}
				_ = author.Conn.WriteJSON(errPayload)
				continue
			}

			// Replace outbound fields with DB authoritative data
			wsMsg.ID = dbMsg.ID
			wsMsg.Timestamp = dbMsg.CreatedAt
			
			log.Printf("%s: %s", authorAddr, strings.TrimSpace(wsMsg.Content))

			// Broadcast only to channel members
			for _, client := range clients {
				if client.ChannelID == wsMsg.Channel {
					err := client.Conn.WriteJSON(wsMsg)
					if err != nil {
						log.Printf("\x1b[31mERROR\x1b[0m: failed to send to %s: %s\n", client.Conn.RemoteAddr(), err)
						client.Conn.Close()
					}
				}
			}
		}
	}
}

func client(conn *websocket.Conn, messages chan Message) {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			conn.Close()
			messages <- Message{
				Type: ClientDisconnected,
				Conn: conn,
			}
			return
		}

		text := string(message)

		if strings.TrimSpace(text) == ":quit" {
			conn.Close()
			messages <- Message{
				Type: ClientDisconnected,
				Conn: conn,
			}
			return
		}

		messages <- Message{
			Type: NewMessage,
			Text: text,
			Conn: conn,
		}
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, messages chan Message, sb *SupabaseClient) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("\x1b[31mERROR\x1b[0m: could not upgrade connection: %s\n", err)
		return
	}

	// Authenticate via token (query param: token)
	token := r.URL.Query().Get("token")
	if token == "" {
		log.Printf("\x1b[31mERROR\x1b[0m: missing token, closing connection")
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "auth required"))
		conn.Close()
		return
	}
	log.Printf("\x1b[33mDEBUG\x1b[0m: received token: %s...", token[:min(20, len(token))])
	user, err := sb.ValidateToken(token)
	if err != nil {
		log.Printf("\x1b[31mERROR\x1b[0m: token validation failed: %v", err)
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid token"))
		conn.Close()
		return
	}

	// Fetch profile (username) from Supabase
	profile, perr := sb.GetProfile(user.ID)
	username := "unknown"
	if perr != nil {
		log.Printf("\x1b[33mWARN\x1b[0m: failed to fetch profile for user %s: %v", user.ID, perr)
	} else if profile != nil {
		username = profile.Username
	}

	messages <- Message{Type: ClientConnected, Conn: conn, Username: username, UserID: user.ID}

	// Store user info in client map (after initial add)
	// We don't have direct reference here; will attach on first join
	// Simpler approach: inject a synthetic join message with username from profile if needed
	_ = user // Future: use user info for presence

	client(conn, messages)
}

func main() {
	err := godotenv.Load()
  	if err != nil {
    log.Fatal("Error loading .env file")
  	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Fatalf("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
	}
	sb := NewSupabaseClient(supabaseURL, serviceKey)

	messages := make(chan Message)
	go server(messages, sb)

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, messages, sb)
	})

	log.Printf("\x1b[32mINFO\x1b[0m: WebSocket server listening on port %s\n", port)
	log.Printf("\x1b[32mINFO\x1b[0m: Connect to ws://localhost:%s/ws\n", port)

	if err = http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("\x1b[31mERROR\x1b[0m: could not start server: %s\n", err)
	}
}
