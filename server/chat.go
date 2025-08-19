package main

import (
	"log"
	"net/http"
    "strings"
    "time"
    "github.com/gorilla/websocket"
)

const port = "8000"
const ratelimit = 1
const bannedLimit = 60*10.0

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow connections from any origin
    },
}

type MessageType int
const
(
    ClientConnected MessageType = iota+1
    ClientDisconnected
    NewMessage
)

type Message struct {
    Type MessageType
    Conn *websocket.Conn
    Text string
}

type Client struct {
    Conn *websocket.Conn
    LastMessage time.Time
    FlagCount int
}

func server(messages chan Message) {
    clients := map[string]*Client{}
    banned_user := map[string]time.Time{}
    
    for {
        msg := <- messages
        switch msg.Type {
        case ClientConnected:
            addr := msg.Conn.RemoteAddr().String()
            ipAddr := strings.Split(addr, ":")[0] // Extract IP from address
            
            bannedAt, banned := banned_user[ipAddr]
            
            if banned {
                if time.Now().Sub(bannedAt).Seconds() >= bannedLimit {
                    delete(banned_user, ipAddr)
                    banned = false
                    log.Printf("\x1b[33mINFO\x1b[0m: IP %s unbanned\n", ipAddr)
                }
            }

            if !banned {
                clients[addr] = &Client{
                    Conn: msg.Conn,
                    LastMessage: time.Now(),
                }
                log.Printf("\x1b[32mINFO\x1b[0m: connected to server: %s\n", addr)
            } else {
                log.Printf("\x1b[33mWARN\x1b[0m: banned IP %s tried to connect\n", ipAddr)
                msg.Conn.Close()
                // Don't add to clients map if banned
            }
            
        case ClientDisconnected:
            fullAddr := msg.Conn.RemoteAddr().String()
            delete(clients, fullAddr)
            log.Printf("\x1b[32mINFO\x1b[0m: disconnected from server: %s\n", fullAddr)
            
        case NewMessage:
            authorAddr := msg.Conn.RemoteAddr().String()
            ipAddr := strings.Split(authorAddr, ":")[0] // Extract IP from address
            now := time.Now()
            
            author, exists := clients[authorAddr]
            if !exists {
                // Client not in map, close connection
                msg.Conn.Close()
                continue
            }
            
            if time.Now().Sub(author.LastMessage).Seconds() >= ratelimit {
                author.LastMessage = now
                author.FlagCount = 0
                log.Printf("%s: %s", authorAddr, strings.TrimSpace(msg.Text))
                
                // Broadcast to all other clients
                for clientAddr, client := range clients {
                    if clientAddr != authorAddr {
                        err := client.Conn.WriteMessage(websocket.TextMessage, []byte(msg.Text))
                        if err != nil {
                            log.Printf("\x1b[31mERROR\x1b[0m: can't send data from server to %s: %s\n", client.Conn.RemoteAddr(), err)
                            // Remove client if write fails
                            delete(clients, clientAddr)
                            client.Conn.Close()
                        }
                    }
                }
            } else {
                author.FlagCount += 1
                log.Printf("\x1b[33mWARN\x1b[0m: rate limit violation by %s (count: %d)\n", authorAddr, author.FlagCount)
                
                if author.FlagCount >= 3 {
                    banned_user[ipAddr] = now
                    delete(clients, authorAddr)
                    author.Conn.Close()
                    log.Printf("\x1b[31mBAN\x1b[0m: IP %s banned for rate limiting\n", ipAddr)
                }
            }
        }
    }
}

func client(conn *websocket.Conn, messages chan Message){
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
        
        // Exit command 
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
