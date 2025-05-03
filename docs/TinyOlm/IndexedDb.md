# 🔐 TinyOlm IndexedDB Encryption Mode

This tutorial provides a info around the TinyOlm API to perform secure encryption and decryption using only **IndexedDB**.  
It includes support for both **individual Olm sessions** and **group Megolm sessions**, with all cryptographic sessions serialized and retrieved directly from `indexedDB`.

## 🔐 Local Storage Mode

To use the IndexedDB-based encryption mode, make sure to **disable the default local memory session system**:

```js
tinyOlm.setUseLocal(false);
```

This is required so that all session operations (such as loading or saving sessions) will exclusively use IndexedDB instead of in-memory storage.  
This ensures persistence across browser reloads and isolates the module for more consistent and stateful encryption behavior.

---

## 📦 Features

This module offers the following methods for secure messaging and data exchange:

### 🧍 One-to-One Communication

- `encryptMessageV2(toUsername, plaintext)`
  - Encrypts a plaintext string for a specific user using an existing Olm session from IndexedDB.
- `decryptMessageV2(fromUsername, messageType, ciphertext)`
  - Decrypts an encrypted message received from a specific user.
- `encryptV2(toUsername, data)`
  - Encrypts any content (object, number, etc.) to a user.
- `decryptV2(fromUsername, messageType, plaintext, expectedType?)`
  - Decrypts content and optionally verifies the data type after deserialization.

### 👥 Group Communication (Megolm)

- `encryptGroupMessageV2(roomId, plaintext)`
  - Encrypts a plaintext string using the outbound group session for a room.
- `decryptGroupMessageV2(roomId, userId, encryptedMessage)`
  - Decrypts a group message using the appropriate inbound session from IndexedDB.
- `encryptGroupContentV2(roomId, data)`
  - Encrypts any structured content (not just strings) for a group session.
- `decryptGroupContentV2(roomId, userId, encryptedMessage, expectedType?)`
  - Decrypts and optionally verifies the type of decrypted group content.

---

## ⚠️ Requirements

Before calling any of the encryption/decryption methods:
- You **must** already have a pickled session stored in IndexedDB.
- This module assumes session management (creation and storage) has been done ahead of time.

---

## 🧠 Note

All encryption and decryption operations internally:
- Retrieve the session from IndexedDB
- Unpickle the session with a password
- Free the session memory securely after use

---

## 💬 Example

```js
await tinyOlm.setUseLocal(false); // Required
const encrypted = await myModule.encryptMessageV2('user123', 'Hello there!');
const decrypted = await myModule.decryptMessageV2('user123', 1, encrypted.body);
```
---

### 🔄 `setUseLocal(value: boolean): void`

Enables or disables **in-memory storage**.

When set to `true`, operations will run using volatile memory with persistent storage.  
Ideal for tests 🧪 or temporary sessions that don't need to be saved.

- **Parameter**:
  - `value` (`boolean`): `true` to enable memory mode 🧠, `false` to disable it.

---

### ❓ `isUseLocal(): boolean`

Checks whether the system is currently using **in-memory storage**.

- **Returns**: `boolean` — `true` if memory mode is active 🟢, `false` otherwise 🔴.

---

### 📦 `exportDbSession(userId: string): Promise<string>`

Exports a specific **Olm session** 🔐 from `indexedDb` for a given user.

- **Parameter**:
  - `userId` (`string`): The remote device’s user ID 👤.

- **Returns**: `Promise<string>` — The serialized (pickled) session 🧴.

- **Throws**: `Error` if the session cannot be found ❌.

---

### 🧑‍🤝‍🧑 `exportDbGroupSession(roomId: string): Promise<string>`

Exports an **outbound group session** 📤 from `indexedDb` for a specific room.

- **Parameter**:
  - `roomId` (`string`): The room’s unique ID 🏠.

- **Returns**: `Promise<string>` — The pickled outbound group session.

- **Throws**: `Error` if the session does not exist ❗.

---

### 🔁 `exportDbInboundGroupSession(roomId: string, userId: string): Promise<string>`

Exports an **inbound group session** 📥 from `indexedDb`, filtered by room and sender.

- **Parameters**:
  - `roomId` (`string`): The room ID 🏠.
  - `userId` (`string`): The sender’s user ID 👤.

- **Returns**: `Promise<string>` — The serialized inbound group session.

- **Throws**: `Error` if the session is missing ⚠️.

---

### 📤 `exportDbInstance(): Promise<ExportedOlmInstance>`

Exports the entire Olm data instance 📚 from `indexedDb`, including:

- Account
- Sessions
- Outbound group sessions
- Inbound group sessions

- **Returns**: `Promise<ExportedOlmInstance>` — A full export of the Olm structure 🧩.

---

### 🗝️ `exportDbGroupSessionId(roomId: string): Promise<string>`

Retrieves the **session key** 🔑 of the current outbound group session for a room in the `indexedDb`.

- **Parameter**:
  - `roomId` (`string`): The room’s ID 🏠.

- **Returns**: `Promise<string>` — The active session key.

- **Throws**: `Error` if no outbound session exists for the room 🛑.

---

### 🔐 `encryptMessageV2(toUsername: string, plaintext: string): Promise<EncryptedMessage>`

Encrypts a **plaintext message** 📝 to a specific user using their stored session.

- **Parameters**:
  - `toUsername` (`string`): Recipient’s user ID 👤
  - `plaintext` (`string`): The message content to encrypt ✉️

- **Returns**: `Promise<EncryptedMessage>` — Encrypted message object 🔒

- **Throws**: `Error` if session with the user does not exist ❌

---

### 🔓 `decryptMessageV2(fromUsername: string, messageType: number, ciphertext: string): Promise<string>`

Decrypts a **received message** 🧾 from a specific user.

- **Parameters**:
  - `fromUsername` (`string`): Sender’s user ID 👤
  - `messageType` (`number`): `0` for pre-key 🔑, `1` for message 💬
  - `ciphertext` (`string`): Encrypted message 🔐

- **Returns**: `Promise<string>` — Decrypted message 📬

- **Throws**: `Error` if session with the user is missing 🚫

---

### 📦 `encryptV2(toUsername: string, data: any): Promise<EncryptedMessage>`

Encrypts **any data** 🧠 to a specific user.

- **Parameters**:
  - `toUsername` (`string`): Recipient’s user ID 👤
  - `data` (`any`): Serializable data to encrypt 🗃️

- **Returns**: `Promise<EncryptedMessage>` — Encrypted package 🔒

- **Throws**: `Error` if no session is found ❗

---

### 🧪 `decryptV2(fromUsername: string, messageType: number, plaintext: string, expectedType?: string|null): Promise<any>`

Decrypts serialized content 📄 and optionally checks its type.

- **Parameters**:
  - `fromUsername` (`string`): Sender’s user ID 👤
  - `messageType` (`number`): 0 (pre-key) or 1 (message) 🛠️
  - `plaintext` (`string`): Encrypted payload 🔐
  - `expectedType` (`string|null`, optional): Validates expected object type 🧩

- **Returns**: `Promise<any>` — Decrypted value 📦

- **Throws**: `Error` if type mismatch or session missing ⚠️

---

### 🏠 `encryptGroupMessageV2(roomId: string, plaintext: string): Promise<EncryptedData>`

Encrypts a plaintext message 📧 for a room using its outbound group session.

- **Parameters**:
  - `roomId` (`string`): The target room ID 🏠
  - `plaintext` (`string`): Message to encrypt 📝

- **Returns**: `Promise<EncryptedData>` — Encrypted message 🔒

- **Throws**: `Error` if no group session exists 🚫

---

### 🗣️ `decryptGroupMessageV2(roomId: string, userId: string, encryptedMessage: EncryptedData): Promise<DecryptedGroupMessage>`

Decrypts a **group message** 📬 using an inbound session.

- **Parameters**:
  - `roomId` (`string`): Room ID 🏠
  - `userId` (`string`): Sender’s user ID 👤
  - `encryptedMessage` (`EncryptedData`): Encrypted payload 🔐

- **Returns**: `Promise<DecryptedGroupMessage>` — Decrypted group message 📭

- **Throws**: `Error` if inbound session is not found ❌

---

### 🗃️ `encryptGroupContentV2(roomId: string, data: any): Promise<EncryptedData>`

Encrypts content 🔧 for a room using group encryption.

- **Parameters**:
  - `roomId` (`string`): Room ID 🏠
  - `data` (`any`): Serializable data 📄

- **Returns**: `Promise<EncryptedData>` — Encrypted data string 🔒

- **Throws**: `Error` if outbound session is missing ❗

---

### 📥 `decryptGroupContentV2(roomId: string, userId: string, encryptedMessage: EncryptedData, expectedType?: string|null): Promise<DecryptedGroupContent>`

Decrypts serialized group content 🧾 with optional type checking.

- **Parameters**:
  - `roomId` (`string`): Room ID 🏠
  - `userId` (`string`): Sender ID 👤
  - `encryptedMessage` (`EncryptedData`): Encrypted input 🔐
  - `expectedType` (`string|null`, optional): Validate expected object type 🎯

- **Returns**: `Promise<DecryptedGroupContent>` — Decrypted and validated content ✅

- **Throws**: `Error` if session missing or type mismatch 🛑
