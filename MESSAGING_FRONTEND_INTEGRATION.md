# 💬 Complete Messaging Module Integration Spec (Rhynk Client UI Ready)

This document provides the full integration specification for all backend messaging capabilities, including 1-on-1 DMs, Group Chats, Emoji Reactions, Quoted Replies, Full-Screen Animations, Typing Indicators, Pin/Mute/Archive settings, and Starred Messages.

---

## 📌 Features & Capabilities Overview

1. **Polyglot Persistence**:
   - **PostgreSQL (Prisma)**: Manages `Conversation` records, `ConversationMember` entries (`role`, `isPinned`, `isMuted`, `isArchived`, `lastReadAt`).
   - **MongoDB (Mongoose)**: Manages `Message` logs (`reactions`, `metadata`, `type`, timestamps) and `StarredMessage` entries.

2. **Full Client Feature Alignment**:
   - ✅ 1-on-1 DMs & Multi-user Group Chats
   - ✅ Emoji Reactions (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`)
   - ✅ Quoted Replies & Full-Screen Animation Effects (`metadata`)
   - ✅ Pin / Mute / Archive Conversation Settings
   - ✅ Starred Messages
   - ✅ Real-time Typing Indicators (`typing_start`, `typing_stop`)
   - ✅ Real-time Read Receipts & Unread Counters

---

## 📡 HTTP Endpoints Reference

Base URL: `http://localhost:4000`  
All HTTP endpoints require: `Authorization: Bearer <accessToken>`

### Summary Table (All 11 Endpoints)

| # | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| 1 | `POST` | `/messaging/conversations/direct` | Start or retrieve a 1-on-1 DM (`{ recipientUserId }`) |
| 2 | `POST` | `/messaging/conversations/group` | Create a multi-user Group Chat (`{ name, memberUserIds, avatarUrl }`) |
| 3 | `GET` | `/messaging/conversations` | List my inbox conversations (with `isPinned`, `isMuted`, `isArchived`, `unreadCount`, `lastMessage`) |
| 4 | `GET` | `/messaging/conversations/:id` | Get details and member list for a single conversation |
| 5 | `PATCH` | `/messaging/conversations/:id/settings` | Update Pin, Mute, or Archive state (`{ isPinned, isMuted, isArchived }`) |
| 6 | `POST` | `/messaging/conversations/:id/messages` | Send message with text, media, quoted reply, or effect metadata |
| 7 | `GET` | `/messaging/conversations/:id/messages` | Fetch paginated chat history (`?limit=30&before=<timestamp>`) |
| 8 | `POST` | `/messaging/conversations/:id/read` | Update last read timestamp / reset unread badge |
| 9 | `POST` | `/messaging/messages/:id/react` | Toggle an emoji reaction (`{ emoji: "❤️" }`) |
| 10 | `POST` | `/messaging/messages/:id/star` | Toggle star/unstar state for a message |
| 11 | `GET` | `/messaging/starred` | Fetch all starred messages for the logged-in user |

---

## 📑 Complete API Endpoints, Payloads, & Responses

### 1. Get or Create 1-on-1 Direct Message
Retrieves an existing 1-on-1 DM or creates a new one by looking up the recipient by their **username**, **email**, or **user ID (UUID)**.

* **Method**: `POST`
* **URL**: `/messaging/conversations/direct`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body (By Username, Email, or UUID)**:
  ```json
  {
    "recipient": "john_doe"
  }
  ```
  *(or `"recipient": "john@gmail.com"` or `"recipientUserId": "c6239129-4560-48e0-a299-d419bf4070a1"`)*
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Direct conversation retrieved successfully",
    "data": {
      "id": "e8492041-9a1b-4322-921d-91b4028fa001",
      "type": "DIRECT",
      "name": null,
      "avatarUrl": null,
      "createdBy": "user-a-uuid",
      "createdAt": "2026-08-31T23:14:00.000Z",
      "members": [
        {
          "id": "mem-1",
          "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
          "userId": "user-a-uuid",
          "role": "MEMBER",
          "isPinned": false,
          "isMuted": false,
          "isArchived": false,
          "joinedAt": "2026-08-31T23:14:00.000Z",
          "lastReadAt": "2026-08-31T23:15:00.000Z",
          "user": {
            "id": "user-a-uuid",
            "username": "alex",
            "name": "Alex",
            "isVerified": true,
            "profile": { "avatarUrl": null, "bio": null, "statusText": null }
          }
        },
        {
          "id": "mem-2",
          "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
          "userId": "c6239129-4560-48e0-a299-d419bf4070a1",
          "role": "MEMBER",
          "isPinned": false,
          "isMuted": false,
          "isArchived": false,
          "joinedAt": "2026-08-31T23:14:00.000Z",
          "lastReadAt": null,
          "user": {
            "id": "c6239129-4560-48e0-a299-d419bf4070a1",
            "username": "recipient_user",
            "name": "Recipient Name",
            "isVerified": true,
            "profile": { "avatarUrl": null, "bio": null, "statusText": null }
          }
        }
      ]
    }
  }
  ```

---

### 2. Create Group Chat
Creates a new multi-user group chat. The creator is assigned the `ADMIN` role, while added users receive `MEMBER` roles.

* **Method**: `POST`
* **URL**: `/messaging/conversations/group`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
  ```json
  {
    "name": "Rhynk Music Squad 🎵",
    "avatarUrl": "https://example.com/avatar.jpg",
    "memberUserIds": [
      "c6239129-4560-48e0-a299-d419bf4070a1",
      "d7340230-5671-59f1-b300-e520cf5181b2"
    ]
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Group conversation created successfully",
    "data": {
      "id": "group-uuid-1234",
      "type": "GROUP",
      "name": "Rhynk Music Squad 🎵",
      "avatarUrl": "https://example.com/avatar.jpg",
      "createdBy": "user-a-uuid",
      "createdAt": "2026-08-31T23:15:00.000Z",
      "members": [
        {
          "id": "mem-1",
          "conversationId": "group-uuid-1234",
          "userId": "user-a-uuid",
          "role": "ADMIN",
          "isPinned": false,
          "isMuted": false,
          "isArchived": false,
          "joinedAt": "2026-08-31T23:15:00.000Z",
          "user": { "id": "user-a-uuid", "username": "alex", "name": "Alex" }
        },
        {
          "id": "mem-2",
          "conversationId": "group-uuid-1234",
          "userId": "c6239129-4560-48e0-a299-d419bf4070a1",
          "role": "MEMBER",
          "isPinned": false,
          "isMuted": false,
          "isArchived": false,
          "joinedAt": "2026-08-31T23:15:00.000Z",
          "user": { "id": "c6239129-4560-48e0-a299-d419bf4070a1", "username": "jane", "name": "Jane" }
        }
      ]
    }
  }
  ```

---

### 3. Get My Inbox Conversations List
Lists all conversations (DMs & Groups) where the authenticated user is a member, including individual settings (`isPinned`, `isMuted`, `isArchived`), `lastMessage` snippet, and `unreadCount`.

* **Method**: `GET`
* **URL**: `/messaging/conversations`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Conversations retrieved successfully",
    "data": [
      {
        "id": "e8492041-9a1b-4322-921d-91b4028fa001",
        "type": "DIRECT",
        "name": null,
        "avatarUrl": null,
        "createdBy": "user-a-uuid",
        "createdAt": "2026-08-31T23:14:00.000Z",
        "members": [ /* Array of conversation members */ ],
        "lastMessage": {
          "_id": "66d3a82f1234567890abcdef",
          "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
          "senderId": "c6239129-4560-48e0-a299-d419bf4070a1",
          "content": "Hey! Let's listen to music together!",
          "type": "TEXT",
          "reactions": [],
          "createdAt": "2026-08-31T23:16:00.000Z"
        },
        "unreadCount": 2
      }
    ]
  }
  ```

---

### 4. Get Conversation Details
Fetches details and member metadata for a single conversation thread.

* **Method**: `GET`
* **URL**: `/messaging/conversations/:id`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Conversation details retrieved successfully",
    "data": {
      "id": "e8492041-9a1b-4322-921d-91b4028fa001",
      "type": "DIRECT",
      "name": null,
      "avatarUrl": null,
      "createdBy": "user-a-uuid",
      "createdAt": "2026-08-31T23:14:00.000Z",
      "members": [ /* Array of member details */ ]
    }
  }
  ```

---

### 5. Update Conversation Settings (Pin / Mute / Archive)
Updates member-specific flags (`isPinned`, `isMuted`, `isArchived`) for organizing the UI inbox tabs ("All", "Unread", "Favourites", "Groups", "Archived").

* **Method**: `PATCH`
* **URL**: `/messaging/conversations/:id/settings`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
  ```json
  {
    "isPinned": true,
    "isMuted": false,
    "isArchived": false
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Conversation settings updated successfully",
    "data": {
      "id": "mem-1",
      "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
      "userId": "user-a-uuid",
      "role": "MEMBER",
      "isPinned": true,
      "isMuted": false,
      "isArchived": false,
      "joinedAt": "2026-08-31T23:14:00.000Z"
    }
  }
  ```

---

### 6. Send Message (with Quoted Reply & Animation Effect)
Sends a message to a conversation thread via HTTP REST. Supports Quoted Reply (`replyToId`) and Full-Screen Effects (`effect`) inside `metadata`.

* **Method**: `POST`
* **URL**: `/messaging/conversations/:id/messages`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
  ```json
  {
    "content": "That was hilarious! 😂",
    "type": "TEXT",
    "metadata": {
      "replyToId": "66d3a8001234567890abcdef",
      "replyToText": "Look at this video",
      "replyToSender": "Jane",
      "effect": "confetti"
    }
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Message sent successfully",
    "data": {
      "_id": "66d3a9501234567890abcdef",
      "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
      "senderId": "user-a-uuid",
      "content": "That was hilarious! 😂",
      "type": "TEXT",
      "metadata": {
        "replyToId": "66d3a8001234567890abcdef",
        "replyToText": "Look at this video",
        "replyToSender": "Jane",
        "effect": "confetti"
      },
      "reactions": [],
      "createdAt": "2026-08-31T23:18:00.000Z",
      "updatedAt": "2026-08-31T23:18:00.000Z"
    }
  }
  ```

---

### 7. Get Message History (Paginated)
Fetches past messages from MongoDB for a chat thread in chronological order (oldest to newest).

* **Method**: `GET`
* **URL**: `/messaging/conversations/:id/messages?limit=30&before=2026-08-31T23:18:00.000Z`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Query Parameters**:
  - `limit` (Optional, integer, default: `30`, max: `100`)
  - `before` (Optional, ISO Date string for pagination scrolling)
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Messages retrieved successfully",
    "data": [
      {
        "_id": "66d3a8001234567890abcdef",
        "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
        "senderId": "user-b-uuid",
        "content": "Look at this video",
        "type": "TEXT",
        "metadata": {},
        "reactions": [],
        "createdAt": "2026-08-31T23:10:00.000Z"
      },
      {
        "_id": "66d3a9501234567890abcdef",
        "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
        "senderId": "user-a-uuid",
        "content": "That was hilarious! 😂",
        "type": "TEXT",
        "metadata": { "replyToId": "66d3a8001234567890abcdef", "effect": "confetti" },
        "reactions": [{ "userId": "user-b-uuid", "emoji": "❤️" }],
        "createdAt": "2026-08-31T23:18:00.000Z"
      }
    ]
  }
  ```

---

### 8. Mark Conversation as Read
Updates the authenticated user's `lastReadAt` cursor timestamp in Postgres to reset unread counters.

* **Method**: `POST`
* **URL**: `/messaging/conversations/:id/read`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Conversation marked as read",
    "data": {
      "success": true,
      "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
      "userId": "user-a-uuid"
    }
  }
  ```

---

### 9. Toggle Emoji Reaction
Adds or removes an emoji reaction (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`) on a message.

* **Method**: `POST`
* **URL**: `/messaging/messages/:id/react`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
  ```json
  {
    "emoji": "❤️"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Reaction updated successfully",
    "data": {
      "_id": "66d3a9501234567890abcdef",
      "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
      "content": "That was hilarious! 😂",
      "reactions": [
        { "userId": "user-a-uuid", "emoji": "❤️" }
      ]
    }
  }
  ```

---

### 10. Toggle Starred Message State
Stars or unstars a message for the authenticated user.

* **Method**: `POST`
* **URL**: `/messaging/messages/:id/star`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Starred message status updated",
    "data": {
      "isStarred": true,
      "messageId": "66d3a9501234567890abcdef"
    }
  }
  ```

---

### 11. Get All Starred Messages
Fetches all starred messages for the authenticated user across all chats.

* **Method**: `GET`
* **URL**: `/messaging/starred`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Starred messages retrieved successfully",
    "data": [
      {
        "_id": "66d3a9501234567890abcdef",
        "conversationId": "e8492041-9a1b-4322-921d-91b4028fa001",
        "senderId": "user-a-uuid",
        "content": "Important address details...",
        "type": "TEXT",
        "createdAt": "2026-08-31T23:18:00.000Z"
      }
    ]
  }
  ```

---

## ⚡ Socket.io WebSockets API Reference

Connect to Socket.io at `http://localhost:4000`:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: accessToken // Send JWT Access Token
  }
});
```

---

### Client Emitters (Frontend → Backend)

1. **Send Real-time Message**:
   ```javascript
   socket.emit('send_message', {
     conversationId: 'e8492041-9a1b-4322-921d-91b4028fa001',
     content: 'Hello via Socket!',
     type: 'TEXT',
     metadata: { replyToId: '...', effect: 'confetti' }
   }, (ack) => {
     if (ack.success) console.log('Delivered:', ack.message);
   });
   ```

2. **Typing Indicators**:
   ```javascript
   // When user starts typing in input box
   socket.emit('typing_start', { conversationId: 'e8492041-9a1b-4322-921d-91b4028fa001' });

   // When user stops typing or clears input box
   socket.emit('typing_stop', { conversationId: 'e8492041-9a1b-4322-921d-91b4028fa001' });
   ```

3. **Real-time Emoji Reaction**:
   ```javascript
   socket.emit('react_message', {
     messageId: '66d3a9501234567890abcdef',
     emoji: '👍'
   }, (ack) => {
     if (ack.success) console.log('Reactions updated:', ack.reactions);
   });
   ```

4. **Mark Read Cursor**:
   ```javascript
   socket.emit('mark_read', { conversationId: 'e8492041-9a1b-4322-921d-91b4028fa001' });
   ```

---

### Server Event Listeners (Backend → Frontend)

1. **`new_message`** (Incoming message in conversation):
   ```javascript
   socket.on('new_message', (message) => {
     // Appends message object to active chat window
   });
   ```

2. **`user_typing`** (Contact started typing):
   ```javascript
   socket.on('user_typing', ({ conversationId, userId }) => {
     // Displays "Typing..." status in chat header
   });
   ```

3. **`user_stopped_typing`** (Contact stopped typing):
   ```javascript
   socket.on('user_stopped_typing', ({ conversationId, userId }) => {
     // Hides "Typing..." status
   });
   ```

4. **`message_reacted`** (Reaction added/removed):
   ```javascript
   socket.on('message_reacted', ({ messageId, conversationId, reactions }) => {
     // Updates reaction pills on target message bubble
   });
   ```

5. **`read_receipt`** (Member read messages up to timestamp):
   ```javascript
   socket.on('read_receipt', ({ conversationId, userId, readAt }) => {
     // Updates double blue checkmarks / read receipt state
   });
   ```
