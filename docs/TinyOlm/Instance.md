## 🔐 Constructor: `new TinyOlm.Instance(userId, deviceId, password?)`

Creates a new **TinyOlmInstance** instance bound to a specific user and device.

### 🧰 Parameters

| Name       | Type     | Description                                                                 |
|------------|----------|-----------------------------------------------------------------------------|
| `userId`   | `string` | The user ID to associate with this account and its cryptographic sessions.  |
| `deviceId` | `string` | The device ID representing this instance of the user.                       |
| `password` | `string` | *(Optional)* A password linked to this account and its sessions.            |

### 📦 Properties

| Property              | Type                                 | Description                                      |
|-----------------------|--------------------------------------|--------------------------------------------------|
| `this.userId`         | `string`                             | The user's unique identifier.                    |
| `this.deviceId`       | `string`                             | The identifier for this specific device.         |
| `this.password`       | `string`                             | Password used in this session (optional).        |
| `this.account`        | `Olm.Account \| null`                | The associated Olm account (or `null` if unset). |
| `this.sessions`       | `Map<string, Olm.Session>`           | Direct peer-to-peer sessions by user/device.     |
| `this.groupSessions`  | `Map<string, Olm.OutboundGroupSession>` | Group encryption sessions (outbound).        |
| `this.groupInboundSessions` | `Map<string, Olm.InboundGroupSession>` | Group decryption sessions (inbound).     |

---

### 🛠️ `init()`

Initializes the Olm library and creates a new account.

#### 🔁 Returns

- **Promise<void>**: Resolves when the Olm library is initialized and the account is created.

#### 🧑‍💻 Example

```javascript
await tinyOlmInstance.init();
console.log('Olm library initialized and account created.');
```

---

### 🏗️ `initIndexedDb(dbName?)`

Initializes the **IndexedDB** database for this TinyOlmInstance and attempts to restore all saved cryptographic state (account, sessions, group sessions).

#### 📥 Parameters

| Name      | Type     | Default              | Description                                  |
|-----------|----------|----------------------|----------------------------------------------|
| `dbName`  | `string` | `'TinyOlmInstance'`  | *(Optional)* The name of the database.       |

#### 🔁 Returns

- `Promise<IDBDatabase>`: Resolves once the database is fully initialized and restored.

#### ⚠️ Throws

- `Error`:  
  - If not running in a browser.  
  - If `dbName` is not a string.  
  - If the database has already been initialized.

#### 🧠 What it does

1. Ensures the environment is a browser and that Olm is loaded.
2. Opens or upgrades the IndexedDB database with object stores:
   - `account`
   - `sessions`
   - `groupSessions`
   - `groupInboundSessions`
3. Emits internal setup events for password, userId, and deviceId.
4. Loads and restores:
   - Your account from storage.
   - All direct sessions.
   - All group sessions (outbound and inbound).
5. Starts watching for any future pickle updates.

---

### 🌐 `validateIsBrowser()`

Checks whether the current environment supports **IndexedDB** — meaning it's running in a web browser.

#### ⚠️ Throws

- `Error`: If not running in a browser or if `indexedDB` is unavailable.

#### 🧠 Purpose

This method ensures that the TinyOlm instance is being used in an environment compatible with browser-based storage.

---

### 🗃️ `getDbName()`

Returns the name of the **IndexedDB** database used by the TinyOlmInstance.

#### 🔁 Returns

- `string`: The name of the current IndexedDB database.

#### ⚠️ Throws

- `Error`: If the internal database name (`#dbName`) is not set correctly (i.e., not a string).

#### 🧠 Note

This method relies on an internal private field `#dbName` and is used to access the database identifier safely.

---

### 🛠️ `getDb()`

Returns the active **IndexedDB** database instance currently used by TinyOlmInstance.

#### 🔁 Returns

- `IDBDatabase`: The open and initialized IndexedDB database instance.

#### ⚠️ Throws

- `Error`: If the database hasn't been initialized yet.  
  _(Hint: Make sure to call `initIndexedDb()` before using this method.)_

#### 🧠 Note

This method accesses the internal private field `#db` and ensures that the database is ready before continuing.

---

### 🧪 `_testIndexedDb()`

*(Internal method)*  
Used for debugging purposes: logs all entries currently stored in the database's object stores.

#### 🔁 Returns

- `Promise<void>` — Logs the contents of:
  - `account`
  - `sessions`
  - `groupSessions`
  - `groupInboundSessions`

---

### 🗂️ `exportInstance(password = this.password)`

Exports the entire **TinyOlmInstance** as a serial structure.

#### 📥 Parameters

| Name        | Type     | Description                                    |
|-------------|----------|------------------------------------------------|
| `password`  | `string` | The password used to pickle the instance. Default is the current instance password. |

#### 🔁 Returns

- `ExportedOlmInstance`: A serial structure containing the pickled account, sessions, group sessions, and inbound group sessions.

#### 🧠 What it does

- Exports the full instance, including account, sessions, group sessions, and inbound group sessions, all pickled with the specified password.

#### 🧑‍💻 Example

```javascript
const exportedInstance = tinyOlmInstance.exportInstance('mySecurePassword');
```

---

### 🧹 `dispose()`

Disposes the TinyOlmInstance by clearing all Olm sessions (both individual and group) and releasing the account from memory.

#### 🔁 Returns
- **void**

#### 🧼 Behavior
- Clears all **1:1 Olm sessions** via `clearSessions()`.
- Frees and nullifies the **Olm account**, emitting `TinyOlmEvents.ResetAccount`.
- Clears all **outbound group sessions**.
- Clears all **inbound group sessions**.

#### 📌 Note
This should be called when the instance is no longer needed, to ensure that memory is properly released and cryptographic material is not kept in memory unnecessarily.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.dispose();
```
