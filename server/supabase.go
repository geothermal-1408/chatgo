package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

type SupabaseClient struct {
	url   string
	key   string
	http  *http.Client
}

type dbMessage struct {
	ID        string  `json:"id"`
	ChannelID string  `json:"channel_id"`
	UserID    string  `json:"user_id"`
	Content   string  `json:"content"`
	ReplyTo   *string `json:"reply_to"`
	Edited    bool    `json:"edited"`
	EditedAt  *string `json:"edited_at"`
	CreatedAt string  `json:"created_at"`
}

type profile struct {
	Username string `json:"username"`
}

type authUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type validateTokenResponse struct {
	User authUser `json:"user"`
}

func NewSupabaseClient(url, key string) *SupabaseClient {
	return &SupabaseClient{url: url, key: key, http: &http.Client{Timeout: 10 * time.Second}}
}

// ValidateToken checks the access token by calling the /auth/v1/user endpoint
func (s *SupabaseClient) ValidateToken(token string) (*authUser, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/auth/v1/user", s.url), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("apikey", s.key) // ✅ FIX: Add required apikey header
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// Read response body for debugging
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("token validation failed: %s, body: %s", resp.Status, string(body))
	}
	
	//  **** Debug: log the raw response to see the structure **** 
	//fmt.Printf("DEBUG: Token validation response: %s\n", string(body))
	
	// Try parsing as direct user response first
	var directUser authUser
	if err := json.Unmarshal(body, &directUser); err == nil && directUser.ID != "" {
		fmt.Printf("DEBUG: Parsed direct user data - ID: '%s', Email: '%s'\n", directUser.ID, directUser.Email)
		return &directUser, nil
	}
	
	// Try parsing as wrapped response
	var data validateTokenResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	
	// Debug: log the parsed user data
	fmt.Printf("DEBUG: Parsed wrapped user data - ID: '%s', Email: '%s'\n", data.User.ID, data.User.Email)
	
	return &data.User, nil
}

// InsertMessage inserts a message with optional reply_to field
func (s *SupabaseClient) InsertMessage(channelID, userID, content string, replyTo *string) (*dbMessage, error) {
	payload := map[string]any{
		"channel_id": channelID,
		"user_id":    userID,
		"content":    content,
	}
	if replyTo != nil && *replyTo != "" {
		payload["reply_to"] = *replyTo
	}
	b, _ := json.Marshal([]map[string]any{payload}) // PostgREST bulk insert format
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequest("POST", fmt.Sprintf("%s/rest/v1/messages", s.url), bytes.NewReader(b))
		if err != nil { return nil, err }
		req.Header.Set("apikey", s.key)
		req.Header.Set("Authorization", "Bearer "+s.key)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Prefer", "return=representation")
		resp, err := s.http.Do(req)
		if err != nil { lastErr = err; time.Sleep(backoff(attempt)); continue }
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == 201 { // created
			var rows []dbMessage
			if err := json.Unmarshal(body, &rows); err != nil { return nil, err }
			if len(rows) == 1 { return &rows[0], nil }
			return nil, errors.New("unexpected insert response size")
		}
		// 409 unlikely without explicit uniqueness constraint; just retry logic above handles transient
		lastErr = fmt.Errorf("insert failed (%d): %s", resp.StatusCode, string(body))
		time.Sleep(backoff(attempt))
	}
	return nil, lastErr
}

// GetChannelMessages fetches recent messages for a channel
func (s *SupabaseClient) GetChannelMessages(channelID string, limit int) ([]dbMessage, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}
	
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/messages?channel_id=eq.%s&select=id,channel_id,user_id,content,reply_to,edited,edited_at,created_at&order=created_at.desc&limit=%d", s.url, channelID, limit), nil)
	if err != nil { 
		return nil, err 
	}
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	
	resp, err := s.http.Do(req)
	if err != nil { 
		return nil, err 
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 { 
		return nil, fmt.Errorf("fetch messages failed: %s, body: %s", resp.Status, string(body))
	}
	
	var messages []dbMessage
	if err := json.Unmarshal(body, &messages); err != nil { 
		return nil, err 
	}
	
	// Reverse the order to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	
	return messages, nil
}

// UpdateMessage updates an existing message's content and marks it as edited
func (s *SupabaseClient) UpdateMessage(messageID, userID, newContent string) (*dbMessage, error) {
	payload := map[string]any{
		"content":   newContent,
		"edited":    true,
		"edited_at": time.Now().Format(time.RFC3339),
	}
	b, _ := json.Marshal(payload)
	
	// Update with RLS check: only message author can edit
	req, err := http.NewRequest("PATCH", fmt.Sprintf("%s/rest/v1/messages?id=eq.%s&user_id=eq.%s", s.url, messageID, userID), bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")
	
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("update message failed (%d): %s", resp.StatusCode, string(body))
	}
	
	var rows []dbMessage
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}
	if len(rows) == 1 {
		return &rows[0], nil
	}
	return nil, errors.New("message not found or not authorized to edit")
}

// DeleteMessage deletes a message (only the author can delete their own messages)
func (s *SupabaseClient) DeleteMessage(messageID, userID string) error {
	// Delete with RLS check: only message author can delete
	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/rest/v1/messages?id=eq.%s&user_id=eq.%s", s.url, messageID, userID), nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := s.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 204 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete message failed (%d): %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// func (s *SupabaseClient) getMessageByClientMsgID(clientMessageID string) (*dbMessage, error) {
// 	req, err := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/messages?client_message_id=eq.%s&select=id,channel_id,user_id,content,created_at", s.url, clientMessageID), nil)
// 	if err != nil { return nil, err }
// 	req.Header.Set("apikey", s.key)
// 	req.Header.Set("Authorization", "Bearer "+s.key)
// 	resp, err := s.http.Do(req)
// 	if err != nil { return nil, err }
// 	defer resp.Body.Close()
// 	if resp.StatusCode != 200 { return nil, fmt.Errorf("fetch by idempotency failed: %s", resp.Status) }
// 	var rows []dbMessage
// 	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil { return nil, err }
// 	if len(rows) == 1 { return &rows[0], nil }
// 	return nil, errors.New("not found or multiple rows for client_message_id")
// }

// GetProfile retrieves a user's profile (currently only username)
func (s *SupabaseClient) GetProfile(userID string) (*profile, error) {
	if userID == "" {
		return nil, fmt.Errorf("empty user ID provided")
	}
	
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/profiles?id=eq.%s&select=username", s.url, userID), nil)
	if err != nil { return nil, err }
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	resp, err := s.http.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()
	
	// Read response body for debugging
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 { 
		return nil, fmt.Errorf("profile fetch failed: %s, body: %s", resp.Status, string(body))
	}
	
	var rows []profile
	if err := json.Unmarshal(body, &rows); err != nil { return nil, err }
	if len(rows) == 1 { return &rows[0], nil }
	return &profile{Username: "unknown"}, nil
}

// GetProfiles retrieves multiple user profiles by their IDs
func (s *SupabaseClient) GetProfiles(userIDs []string) (map[string]string, error) {
	if len(userIDs) == 0 {
		return make(map[string]string), nil
	}
	
	// Build the query with multiple user IDs
	userIDsStr := ""
	for i, id := range userIDs {
		if i > 0 {
			userIDsStr += ","
		}
		userIDsStr += id
	}
	
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/profiles?id=in.(%s)&select=id,username", s.url, userIDsStr), nil)
	if err != nil { 
		return nil, err 
	}
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	
	resp, err := s.http.Do(req)
	if err != nil { 
		return nil, err 
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 { 
		return nil, fmt.Errorf("profiles fetch failed: %s, body: %s", resp.Status, string(body))
	}
	
	var profiles []struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &profiles); err != nil { 
		return nil, err 
	}
	
	// Convert to map for easy lookup
	result := make(map[string]string)
	for _, profile := range profiles {
		result[profile.ID] = profile.Username
	}
	
	// Add fallback usernames for missing profiles
	for _, userID := range userIDs {
		if _, exists := result[userID]; !exists {
			result[userID] = "unknown"
		}
	}
	
	return result, nil
}

func backoff(attempt int) time.Duration {
	return time.Duration(200*(1<<attempt)) * time.Millisecond
}
