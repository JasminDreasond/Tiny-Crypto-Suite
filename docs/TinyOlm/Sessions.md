### 🔄 `getAllSessions()`

Retrieves all active sessions.

#### 🔁 Returns

- **Map<string, Olm.Session>**: A map of all active sessions, where the key is the userId.

#### 🧑‍💻 Example

```javascript
const allSessions = tinyOlmInstance.getAllSessions();
console.log(allSessions);
```

---

### 🧑‍💻 `getSession(userId)`

Retrieves the session for a specific **userId**.

#### 📥 Parameters

| Name     | Type     | Description                                       |
|----------|----------|---------------------------------------------------|
| `userId` | `string` | The userId whose session is to be retrieved.      |

#### 🔁 Returns

- **Olm.Session**: The session for the specified **userId**, or `null` if no session exists.

#### 🧠 Throws

- **Error**: If no session exists for the specified **userId**.

#### 🧑‍💻 Example

```javascript
const session = tinyOlmInstance.getSession('@user:domain.com');
console.log(session);
```

---

### ❌ `removeSession(userId)`

Removes the session for a specific **userId**.

#### 📥 Parameters

| Name     | Type     | Description                                       |
|----------|----------|---------------------------------------------------|
| `userId` | `string` | The userId whose session is to be removed.        |

#### 🔁 Returns

- **boolean**: Returns `true` if the session was removed, otherwise `false`.

#### 🧠 Throws

- **Error**: If no session exists for the specified **userId**.

#### 🧑‍💻 Example

```javascript
const wasRemoved = tinyOlmInstance.removeSession('@user:domain.com');
console.log(wasRemoved); // true if session was removed
```

---

### 🧹 `clearSessions()`

Clears all active sessions.

#### 🔁 Returns

- **void**

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.clearSessions();
```

---

### 🧪 `hasSession(userId)`

Checks whether there is an active Olm session with a specific user.

#### 📥 Parameters
- `userId` *(string)*: The user ID to check for an existing session.

#### 🔁 Returns
- **boolean**: `true` if a session exists, `false` otherwise.

#### 🧑‍💻 Example

```javascript
if (tinyOlmInstance.hasSession('@alice')) {
  console.log('Session with Alice exists!');
}
```

---

### 🛠️ `exportSession(userId, password = this.password)`

Exports a specific **Olm.Session** with a given user.

#### 📥 Parameters

| Name        | Type     | Description                                      |
|-------------|----------|--------------------------------------------------|
| `userId`    | `string` | The user ID of the remote device.                |
| `password`  | `string` | The password used to encrypt the pickle. Default is the current instance password. |

#### 🔁 Returns

- `string`: The pickled Olm session.

#### ⚠️ Throws

- `Error`: If the session is not found.

#### 🧠 What it does

- Exports the session with the specified user as a pickled string, encrypted with the specified password.

#### 🧑‍💻 Example

```javascript
const pickledSession = tinyOlmInstance.exportSession('@user:domain.com', 'mySecurePassword');
```

---

### 📤 `createOutboundSession(theirIdentityKey, theirOneTimeKey, theirUsername)`

Creates an outbound Olm session with another user using their identity and one-time keys.

#### 📥 Parameters
- `theirIdentityKey` *(string)*: Identity key of the target user.
- `theirOneTimeKey` *(string)*: One-time key of the target user.
- `theirUsername` *(string)*: User ID of the target user.

#### 🔁 Returns
- **void**

#### 🛑 Throws
- **Error**: If the account is not initialized or no one-time key is available.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.createOutboundSession(theirIdentityKey, theirOneTimeKey, '@alice');
```

---

### 📥 `createInboundSession(senderIdentityKey, ciphertext, senderUsername)`

Creates an inbound Olm session based on a received ciphertext and sender's identity key.

#### 📥 Parameters
- `senderIdentityKey` *(string)*: Identity key of the sender.
- `ciphertext` *(string)*: Encrypted message received.
- `senderUsername` *(string)*: User ID of the sender.

#### 🔁 Returns
- **void**

#### 🛑 Throws
- **Error**: If the account is not initialized.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.createInboundSession(senderIdentityKey, ciphertext, '@bob');
```

---

### 🔐 `encryptMessage(toUsername, plaintext)`

Encrypts a raw plaintext message using an existing session with the recipient.

#### 📥 Parameters
- `toUsername: string` – The user ID of the recipient.
- `plaintext: string` – The message content in plaintext.

#### 📤 Returns
- `EncryptedMessage`: The encrypted message object (`{ type, body }`).

#### ⚠️ Throws
- If no session exists with the given user.

#### 🧑‍💻 Example
```js
const encrypted = tinyOlmInstance.encryptMessage('alice', 'Hello!');
```

---

### 🔓 `decryptMessage(fromUsername, messageType, ciphertext)`

Decrypts a ciphertext message from a known session.

#### 📥 Parameters
- `fromUsername: string` – The sender's user ID.
- `messageType: 0 | 1` – The message type (0 = pre-key, 1 = message).
- `ciphertext: string` – The received encrypted content.

#### 📤 Returns
- `string`: The decrypted plaintext.

#### ⚠️ Throws
- If no session exists with the sender.

#### 🧑‍💻 Example
```js
const plaintext = tinyOlmInstance.decryptMessage('alice', 1, encrypted.body);
```

---

### 🧪 `encrypt(toUsername, data)`

Serializes and encrypts any data structure using the appropriate serializer (`TinyCryptoParser`).

#### 📥 Parameters
- `toUsername: string` – The recipient’s user ID.
- `data: *` – The data to serialize and encrypt.

#### 📤 Returns
- `EncryptedMessage`: The encrypted result of the serialized content.

#### 🔧 Behavior
- Uses `serializeDeep()` if `isDeep === true`, otherwise `serialize()`.

#### 🧑‍💻 Example
```js
const encrypted = tinyOlmInstance.encrypt('bob', { hello: 'world' });
```

---

### 🔍 `decrypt(fromUsername, messageType, plaintext, expectedType = null)`

Decrypts and deserializes a message received from another user.

#### 📥 Parameters
- `fromUsername: string` – The sender’s user ID.
- `messageType: 0 | 1` – The type of Olm message.
- `plaintext: string` – The encrypted message.
- `expectedType?: string | null` – Optional: expected data type to validate deserialization.

#### 📤 Returns
- `*`: The deserialized content (any JS object or value).

#### 🔧 Behavior
- Uses `deserializeDeep()` if `isDeep === true`, otherwise `deserialize()`.

#### 🧑‍💻 Example
```js
const object = tinyOlmInstance.decrypt('bob', 1, ciphertext, 'object');
```
