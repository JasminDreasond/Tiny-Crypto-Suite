### 📥 `importInboundGroupSession(key, pickled, password?)`

Imports and restores an **inbound group Olm session** from a pickled string for decrypting messages from other users.

#### 🔁 Returns
- **Promise<void>**

#### 🧼 Behavior
- Creates a new `Olm.InboundGroupSession` and unpickles it using the `password`.
- Stores the session in `this.groupInboundSessions` under the given `key`.
- Persists the session in IndexedDB under `groupInboundSessions`.
- Emits `TinyOlmEvents.ImportInboundGroupSession`.

#### 📌 Note
Commonly used when receiving encrypted messages from other users in group chats.

#### 🧑‍💻 Example

```javascript
await tinyOlmInstance.importInboundGroupSession(senderKey, pickledInboundSession);
```

---

### 💬 `exportInboundGroupSession(roomId, userId, password = this.password)`

Exports an **inbound group session** for a specific room and sender.

#### 📥 Parameters

| Name        | Type     | Description                                      |
|-------------|----------|--------------------------------------------------|
| `roomId`    | `string` | The ID of the room.                              |
| `userId`    | `string` | The sender's userId or session owner.           |
| `password`  | `string` | The password used to encrypt the pickle. Default is the current instance password. |

#### 🔁 Returns

- `string`: The pickled inbound group session.

#### ⚠️ Throws

- `Error`: If the inbound group session is not found.

#### 🧠 What it does

- Exports the inbound group session for the specified room and sender as a pickled string, encrypted with the specified password.

#### 🧑‍💻 Example

```javascript
const pickledInboundGroupSession = tinyOlmInstance.exportInboundGroupSession('roomId123', '@user:domain.com', 'mySecurePassword');
```

---

### 🛠️ `importGroupSessionId(roomId, userId, sessionKey)`

Imports an inbound group session using a provided session key.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the session will be imported.
- **userId** *(string)*: The ID of the user to whom the session belongs.
- **sessionKey** *(string)*: The session key to import the group session.

#### 🔁 Returns
- **void**

#### 🧑‍💻 Example

```javascript
await tinyOlmInstance.importGroupSessionId('room123', 'user456', 'sessionKey123');
```

---

### 🛠️ `getAllInboundGroupSessions()`

Returns all inbound group sessions.

#### 🔁 Returns
- **Map<string, Olm.InboundGroupSession>**: A map of all inbound group sessions, indexed by session ID.

#### 🧑‍💻 Example

```javascript
const allSessions = tinyOlmInstance.getAllInboundGroupSessions();
console.log(allSessions);
```

---

### 🛠️ `getInboundGroupSession(roomId, userId)`

Returns a specific inbound group session by room ID and userId.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the inbound group session exists.
- **userId** *(string)*: The ID of the user whose inbound group session is to be retrieved.

#### 🔁 Returns
- **Olm.InboundGroupSession**: The inbound group session for the specified room and user.

#### 🛑 Throws
- **Error**: If no inbound session exists for the given room and userId.

#### 🧑‍💻 Example

```javascript
const session = tinyOlmInstance.getInboundGroupSession('room123', 'user456');
console.log(session); // Olm.InboundGroupSession
```

---

### 🛠️ `removeInboundGroupSession(roomId, userId)`

Removes a specific inbound group session by room ID and userId.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room whose inbound group session will be removed.
- **userId** *(string)*: The ID of the user whose inbound group session will be removed.

#### 🔁 Returns
- **boolean**: Returns `true` if the session was removed, otherwise `false`.

#### 🧑‍💻 Example

```javascript
const success = await tinyOlmInstance.removeInboundGroupSession('room123', 'user456');
console.log(success); // true if removed
```

---

### 🛠️ `clearInboundGroupSessions()`

Clears all inbound group sessions.

#### 🔁 Returns
- **void**

#### 🧑‍💻 Example

```javascript
await tinyOlmInstance.clearInboundGroupSessions();
console.log('All inbound group sessions cleared.');
```

---

### 🛠️ `decryptGroupMessage(roomId, userId, encryptedMessage)`

Decrypts an encrypted group message using the inbound group session.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the message was sent.
- **userId** *(string)*: The ID of the user who is decrypting the message.
- **encryptedMessage** *(Object)*: An object containing:
  - `body` *(string)*: The encrypted message body.
  - `session_id` *(string)*: The session ID for the encrypted message.
  - `message_index` *(number)*: The message index.

#### 🔁 Returns
- **Object**: An object containing:
  - `message_index` *(number)*: The message index of the decrypted message.
  - `plaintext` *(string)*: The decrypted plaintext message.

#### 🛑 Throws
- **Error**: If no inbound session exists for the given room and userId.

#### 🧑‍💻 Example

```javascript
const decryptedMessage = tinyOlmInstance.decryptGroupMessage('room123', 'user456', encryptedMessage);
console.log(decryptedMessage);
```

---

### 🛠️ `decryptGroupContent(roomId, userId, encryptedMessage, expectedType = null)`

Decrypts encrypted content using the inbound group session.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the content was sent.
- **userId** *(string)*: The ID of the user who is decrypting the content.
- **encryptedMessage** *(Object)*: An object containing:
  - `body` *(string)*: The encrypted content body.
  - `session_id` *(string)*: The session ID for the encrypted content.
  - `message_index` *(number)*: The message index.
- **expectedType** *(string|null)*: Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.

#### 🔁 Returns
- **Object**: An object containing:
  - `message_index` *(number)*: The message index of the decrypted content.
  - `content` *(any)*: The decrypted content.

#### 🛑 Throws
- **Error**: If no inbound session exists for the given room and userId.

#### 🧑‍💻 Example

```javascript
const decryptedContent = tinyOlmInstance.decryptGroupContent('room123', 'user456', encryptedContent);
console.log(decryptedContent);
```