package main

import (
	"log"
	"math/rand"
	"net/http"
	"strings"
	"encoding/json"
	"time"
	"github.com/gorilla/websocket"
)

const port = "8000"

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
}

// Each connected client
type Client struct {
	Conn       *websocket.Conn
	Username   string
	ChannelID  string        // ✅ FIX: Track which channel the client is in
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

func server(messages chan Message) {
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

			// Check if this is a reconnection (same IP)
			existingClient := clients[addr]
			if existingClient != nil {
				log.Printf("\x1b[33mINFO\x1b[0m: client %s reconnecting, cleaning up old connection\n", addr)
				existingClient.Conn.Close()
			}
			
			clients[addr] = &Client{
				Conn: msg.Conn,
				Username: "",
				ChannelID: "",   // ✅ FIX: Initially no channel
			}
			log.Printf("\x1b[32mINFO\x1b[0m: connected to server: %s\n", addr)

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

			// Handle join messages (initial connection or channel switch)
			if wsMsg.Type == "join" || author.Username == "" {
				author.Username = wsMsg.Username
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
				
				// Notify others in the same channel that this user joined
				joinMsg := WSMessage{
					Type: "user_joined",
					Username: wsMsg.Username,
					Channel: wsMsg.Channel,
					Timestamp: time.Now().Format(time.RFC3339), // ✅ FIX: Add timestamp
					ID: generateID(), // ✅ FIX: Add ID
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
			
			// ✅ FIX: Ensure message has an ID
			if wsMsg.ID == "" {
				wsMsg.ID = generateID()
			}
			
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

func handleWebSocket(w http.ResponseWriter, r *http.Request, messages chan Message) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("\x1b[31mERROR\x1b[0m: could not upgrade connection: %s\n", err)
		return
	}

	messages <- Message{
		Type: ClientConnected,
		Conn: conn,
	}

	client(conn, messages)
}

func main() {
	messages := make(chan Message)
	go server(messages)

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, messages)
	})

	log.Printf("\x1b[32mINFO\x1b[0m: WebSocket server listening on port %s\n", port)
	log.Printf("\x1b[32mINFO\x1b[0m: Connect to ws://localhost:%s/ws\n", port)

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatalf("\x1b[31mERROR\x1b[0m: could not start server: %s\n", err)
	}
}
