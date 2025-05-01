### 🆔 `checkUserId(userId)`

Validates whether a given user ID follows the correct format.

A valid Matrix user ID must start with `@`, contain at least one character, followed by a `:`, and then at least one more character (e.g., `@user:domain.com`).

#### 📥 Parameters

| Name     | Type     | Description                         |
|----------|----------|-------------------------------------|
| `userId` | `string` | The Matrix user ID to validate.     |

#### ⚠️ Throws

- `Error`: If the `userId` doesn't match the expected format.

#### 🧠 Example

```javascript
checkUserId('@user:domain.com'); // ✅ Valid
checkUserId('user@domain.com');  // ❌ Invalid
```

---

### 🔒 `setPassword(newPassword)`

Sets a new password for the TinyOlmInstance.

#### 📥 Parameters

| Name        | Type     | Description                        |
|-------------|----------|------------------------------------|
| `newPassword` | `string` | The new password to set for the instance. |

#### ⚠️ Throws

- `Error`: If the provided password is not a string.

#### 🧠 What it does

- Updates the internal password value.
- Emits an event (`SetPassword`) to notify that the password has changed.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.setPassword('newSecurePassword123');
```

---

### 🔑 `getPassword()`

Returns the current password used for (un)pickling.

#### 🔁 Returns

- `string`: The current password.

#### ⚠️ Throws

- `Error`: If the password has not been set.

#### 🧠 Example

```javascript
const password = tinyOlmInstance.getPassword();
```

---

### 🧑‍💻 `setUserId(newUserId)`

Sets a new **userId** for the TinyOlmInstance.

#### 📥 Parameters

| Name        | Type     | Description                        |
|-------------|----------|------------------------------------|
| `newUserId` | `string` | The new user ID to set for the instance. |

#### ⚠️ Throws

- `Error`: If the provided `newUserId` is not a string.

#### 🧠 What it does

- Updates the internal `userId` value.
- Emits an event (`SetUserId`) to notify that the `userId` has been changed.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.setUserId('@newUser:domain.com');
```

---

### 🆔 `getUserId()`

Returns the current **userId** used by the TinyOlm instance.

#### 🔁 Returns

- `string`: The current user ID.

#### ⚠️ Throws

- `Error`: If the `userId` has not been set.

#### 🧠 Example

```javascript
const userId = tinyOlmInstance.getUserId();
```

---

### 🖥️ `setDeviceId(newDeviceId)`

Sets a new **deviceId** for the TinyOlm instance.

#### 📥 Parameters

| Name          | Type     | Description                           |
|---------------|----------|---------------------------------------|
| `newDeviceId` | `string` | The new device ID to set for the instance. |

#### ⚠️ Throws

- `Error`: If the provided `newDeviceId` is not a string.

#### 🧠 What it does

- Updates the internal `deviceId` value.
- Emits an event (`SetDeviceId`) to notify that the `deviceId` has been changed.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.setDeviceId('device123');
```

---

### 📱 `getDeviceId()`

Returns the current **deviceId** used by the TinyOlm instance.

#### 🔁 Returns

- `string`: The current device ID.

#### ⚠️ Throws

- `Error`: If the `deviceId` has not been set.

#### 🧠 Example

```javascript
const deviceId = tinyOlmInstance.getDeviceId();
```

---

### 🔄 `exportAccount(password = this.password)`

Exports the current **Olm.Account** as a pickled string.

#### 📥 Parameters

| Name        | Type     | Description                                    |
|-------------|----------|------------------------------------------------|
| `password`  | `string` | The password used to encrypt the pickle. Default is the current instance password. |

#### 🔁 Returns

- `string`: The pickled Olm account.

#### ⚠️ Throws

- `Error`: If the account is not initialized.

#### 🧠 What it does

- Exports the Olm account as a pickled string, encrypted with the specified password.

#### 🧑‍💻 Example

```javascript
const pickledAccount = tinyOlmInstance.exportAccount('mySecurePassword');
```

---

### 🛠️ `getIdentityKeys()`

Retrieves the identity keys (`curve25519` and `ed25519`) for the current account.

#### 💡 Returns
- **Object**: A JSON object with the following structure:
  - `curve25519` *(Record<string, string>)*: Curve25519 identity keys, typically keyed by device.
  - `ed25519` *(string)*: Ed25519 identity key (used for signing).

#### 🛑 Throws
- **Error**: If the account is not initialized.

#### 🧑‍💻 Example

```javascript
const keys = tinyOlmInstance.getIdentityKeys();
console.log(keys.curve25519, keys.ed25519);
```

---

### 🛠️ `generateOneTimeKeys(number = 10)`

Generates a specified number of one-time keys for the account and signs them.

#### 💡 Parameters
- **number** *(number, optional)*: Number of one-time keys to generate. Defaults to 10 if not provided.

#### 🔁 Returns
- **void**

#### 🛑 Throws
- **Error**: If the account is not initialized.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.generateOneTimeKeys(5);
// Now the account has 5 new signed one-time keys.
```

---

### 🧷 `getOneTimeKeys()`

Retrieves the currently available one-time keys for the account.

#### 💡 Returns
- **Object**:
  - `curve25519` *(Record<string, string>)*: Map of one-time Curve25519 keys.

#### 🛑 Throws
- **Error**: If the account is not initialized.

#### 🧑‍💻 Example

```javascript
const oneTimeKeys = tinyOlmInstance.getOneTimeKeys();
console.log(oneTimeKeys.curve25519);
```

---

### 🔒 `markKeysAsPublished()`

Marks the current one-time keys as published, so they won't be reused.

#### 🔁 Returns
- **void**

#### 🛑 Throws
- **Error**: If the account is not initialized.

#### 🧑‍💻 Example

```javascript
tinyOlmInstance.markKeysAsPublished();
```

---

### 🔐 `exportIdentityAndOneTimeKeys()`

Exports the device identity keys and available one-time keys in a format compatible with the Matrix spec.

#### 🔁 Returns
- **object**: A structured object containing:
  - `device_id` *(string)*: The local device ID.
  - `user_id` *(string)*: The user ID associated with the device.
  - `algorithms` *(string[])*: List of supported encryption algorithms.
  - `keys` *(object)*: The identity keys (`curve25519` and `ed25519`) keyed by their algorithm and device.
  - `signatures` *(object)*: Signature block for verifying the device identity.
  - `one_time_keys` *(object)*: The available one-time keys in `curve25519` format.

#### ⚠️ Throws
- **Error**: If the Olm account is not initialized.

#### 🧑‍💻 Example

```javascript
const exportedKeys = tinyOlmInstance.exportIdentityAndOneTimeKeys();
console.log(exportedKeys.keys);
```

---

### 🔁 `regenerateIdentityKeys()`

Regenerates the identity keys (`curve25519` and `ed25519`) by creating a new `Olm.Account`.

#### 📥 Returns
- `Promise<void>`

#### ⚠️ Important Steps After Use
After calling this method, you **must**:
1. Call `generateOneTimeKeys()` to create new one-time keys.
2. Call `markKeysAsPublished()` to mark them as ready for use.
3. Update your device info on the server to broadcast the new keys.

#### 🔧 Behavior
- Frees the existing `Olm.Account` if any.
- Emits `TinyOlmEvents.ResetAccount` and `TinyOlmEvents.CreateAccount`.
- Creates a brand-new identity for the client.

#### 💡 Use when:
- You want to reset your device’s identity.
- You suspect key compromise or need to rotate identity keys.

#### 🧑‍💻 Example
```javascript
await tinyOlmInstance.regenerateIdentityKeys();
await tinyOlmInstance.generateOneTimeKeys();
tinyOlmInstance.markKeysAsPublished();
```

---

### 📤 `getEncryptEvent(encrypted, toDeviceCurve25519Key)`

Constructs an Olm-encrypted message payload to be sent to a specific device.

#### 📥 Parameters
- `encrypted: EncryptedMessage` – An object with message type and encrypted body.
- `toDeviceCurve25519Key: string` – The Curve25519 key of the recipient device.

#### 📤 Returns
```ts
{
  algorithm: 'm.olm.v1.curve25519-aes-sha2',
  sender_key: string,
  ciphertext: {
    [recipient_curve25519_key]: {
      type: 0 | 1,
      body: string
    }
  }
}
```

#### 🧠 Details
- The `type` property should be:
  - `0` for **pre-key messages**
  - `1` for **normal Olm messages**

#### 🧑‍💻 Example
```javascript
const event = tinyOlmInstance.getEncryptEvent({ type: 0, body: 'ciphertext' }, 'XYZCurve25519Key');
```
