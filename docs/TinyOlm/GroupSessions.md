### 🌐 `exportGroupSession(roomId, password = this.password)`

Exports an **outbound group session** for a specific room.

#### 📥 Parameters

| Name        | Type     | Description                                      |
|-------------|----------|--------------------------------------------------|
| `roomId`    | `string` | The ID of the room.                              |
| `password`  | `string` | The password used to encrypt the pickle. Default is the current instance password. |

#### 🔁 Returns

- `string`: The pickled outbound group session.

#### ⚠️ Throws

- `Error`: If the group session is not found.

#### 🧠 What it does

- Exports the outbound group session for the specified room as a pickled string, encrypted with the specified password.

#### 🧑‍💻 Example

```javascript
const pickledGroupSession = tinyOlmInstance.exportGroupSession('roomId123', 'mySecurePassword');
```

---

### 🛠️ `createGroupSession(roomId)`

Creates a new outbound group session for a specific room.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the session will be created.

#### 🔁 Returns
- **Olm.OutboundGroupSession**: The newly created outbound group session.

#### 🧑‍💻 Example

```javascript
const roomId = 'room123';
const session = tinyOlmInstance.createGroupSession(roomId);
console.log(session); // Olm.OutboundGroupSession
```

---

### 🛠️ `exportGroupSessionId(roomId)`

Exports the current outbound group session key for a room.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room whose group session key is being exported.

#### 🔁 Returns
- **string**: The session key for the outbound group session.

#### 🛑 Throws
- **Error**: If no outbound session exists for the given room.

#### 🧑‍💻 Example

```javascript
const sessionKey = tinyOlmInstance.exportGroupSessionId('room123');
console.log(sessionKey); // The exported session key
```

---

### 🛠️ `getAllGroupSessions()`

Returns all outbound group sessions.

#### 🔁 Returns
- **Map<string, Olm.OutboundGroupSession>**: A map of all outbound group sessions, indexed by room ID.

#### 🧑‍💻 Example

```javascript
const allSessions = tinyOlmInstance.getAllGroupSessions();
console.log(allSessions);
```

---

### 🛠️ `getGroupSession(roomId)`

Returns a specific outbound group session by room ID.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room whose group session you want to retrieve.

#### 🔁 Returns
- **Olm.OutboundGroupSession**: The outbound group session for the specified room.

#### 🛑 Throws
- **Error**: If no outbound session exists for the given room.

#### 🧑‍💻 Example

```javascript
const session = tinyOlmInstance.getGroupSession('room123');
console.log(session); // Olm.OutboundGroupSession
```

---

### 🛠️ `removeGroupSession(roomId)`

Removes a specific outbound group session by room ID.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room whose group session should be removed.

#### 🔁 Returns
- **boolean**: Returns `true` if the session was removed, otherwise `false`.

#### 🧑‍💻 Example

```javascript
const success = tinyOlmInstance.removeGroupSession('room123');
console.log(success); // true if removed
```

---

### 🛠️ `clearGroupSessions()`

Clears all group sessions.

#### 🔁 Returns
- **void**

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.clearGroupSessions();
console.log('All group sessions cleared.');
```

---

### 🛠️ `encryptGroupMessage(roomId, plaintext)`

Encrypts a plaintext message for a specific room using the outbound group session.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the message will be encrypted.
- **plaintext** *(string)*: The plaintext message to be encrypted.

#### 🔁 Returns
- **Object**: An object containing the following fields:
  - `body` *(string)*: The encrypted ciphertext of the message.
  - `session_id` *(string)*: The session ID of the outbound group session.
  - `message_index` *(number)*: The message index of the encrypted message.

#### 🛑 Throws
- **Error**: If no outbound session exists for the given room.

#### 🧑‍💻 Example

```javascript
const encryptedMessage = tinyOlmInstance.encryptGroupMessage('room123', 'Hello, World!');
console.log(encryptedMessage);
```

---

### 🛠️ `encryptGroupContent(roomId, data)`

Encrypts content for a specific room using the outbound group session.

#### 💡 Parameters
- **roomId** *(string)*: The ID of the room where the content will be encrypted.
- **data** *(any)*: The content to be encrypted.

#### 🔁 Returns
- **Object**: An object containing the following fields:
  - `body` *(string)*: The encrypted ciphertext of the content.
  - `session_id` *(string)*: The session ID of the outbound group session.
  - `message_index` *(number)*: The message index of the encrypted content.

#### 🛑 Throws
- **Error**: If no outbound session exists for the given room.

#### 🧑‍💻 Example

```javascript
const encryptedContent = tinyOlmInstance.encryptGroupContent('room123', { someKey: 'someValue' });
console.log(encryptedContent);
```
