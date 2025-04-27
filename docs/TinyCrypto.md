# 🔐 Tiny Crypto

**Tiny Crypto** is a flexible and browser-compatible encryption utility class built for AES-256-GCM encryption with full support for serialization and deserialization of complex JavaScript data types.

Whether you're in Node.js or a browser, Tiny Crypto helps you easily encrypt/decrypt values, save/load configurations, and keep your secrets safe — all while supporting real-world usage like RegExp, Date, Buffer, and even DOM elements (in browsers only)!

---

## ✨ Features

- 🔒 AES-256-GCM symmetric encryption
- 🧠 Automatic serialization of complex types (Date, RegExp, Set, Map, etc.)
- 📤 Save and load keys/configs from files
- 🌐 Works in both **Node.js** and **Browsers**
- ⚠️ Type validation on decryption
- 💾 Smart support for file APIs (e.g. `FileReader` in browser, `fs` in Node)

---

## 🚀 Getting Started

```js
const crypto = new TinyCrypto();

// Encrypt some data
const { encrypted, iv, authTag } = crypto.encrypt({ hello: 'world' });

// Decrypt it back
const decrypted = crypto.decrypt({ encrypted, iv, authTag });

console.log(decrypted); // { hello: 'world' }
```

---

## 🧠 Supported Data Types

When you encrypt a value, its type is recorded and restored when decrypted.

Supports:

- `String`, `Number`, `Boolean`, `BigInt`, `Null`, `Undefined`
- `Array`, `Object`, `Map`, `Set`, `Buffer`
- `RegExp`, `Date`, `Symbol`
- `HTMLElement` _(browser only)_

Does NOT support:

- `Function`, `Promise`, `WeakMap`, `WeakSet` → ❌ Will throw!

---

## 🔧 API

### `constructor(options)`

| Option           | Type   | Default         | Description                       |
| ---------------- | ------ | --------------- | --------------------------------- |
| `algorithm`      | string | `'aes-256-gcm'` | AES algorithm used for encryption |
| `key`            | Buffer | auto-generated  | The secret key to use (32 bytes)  |
| `outputEncoding` | string | `'hex'`         | Encoding used for outputs         |
| `inputEncoding`  | string | `'utf8'`        | Encoding used for plain data      |
| `authTagLength`  | number | `16`            | GCM auth tag length               |

---

### 🔒 `encrypt(data, iv?)`

Encrypts a value and returns an object with `{ iv, encrypted, authTag }`.

```js
const result = crypto.encrypt('Hello!');
```

---

### 🔓 `decrypt({ iv, encrypted, authTag }, expectedType?)`

Decrypts a previously encrypted value and returns the original data. You can optionally pass an `expectedType` to validate it.

```js
const plain = crypto.decrypt(result, 'string');
```

---

### 🔎 `getTypeFromEncrypted({ iv, encrypted, authTag })`

Returns the type name of the encrypted data without fully decrypting it.

---

### 🔑 `generateKey(length = 32)`

Generates a secure random key. Default: 32 bytes (AES-256).

---

### 🧬 `generateIV(length = 12)`

Generates a secure random IV. Default: 12 bytes (GCM standard).

---

### 🔑 `getKey()`

This method returns the current cryptographic key used internally by the class.
The key is converted to a hexadecimal (hex) string before being returned.

---

### 🔑 `setKey(keyHex)`

This method allows setting a cryptographic key directly. The key should be provided as a string (in hex format) and will be converted to a Buffer for internal use. If the key format is incorrect, an error will be thrown.

---

### 💾 `saveKeyToFile(filename = 'secret.key')`

Saves the current key to a file (browser: prompts download).

---

### 📂 `loadKeyFromFile(file)`

Loads a key from a file (browser: File object, Node: file path).

---

### 💾 `saveConfigToFile(filename = 'crypto-config.json')`

Saves the current configuration as JSON.

---

### 📂 `loadConfigFromFile(file)`

Loads configuration from a JSON file.

---

### 📦 `exportConfig()`

Returns an object with the current settings:

```json
{
  "algorithm": "aes-256-gcm",
  "outputEncoding": "hex",
  "inputEncoding": "utf8",
  "authTagLength": 16,
  "key": "..."
}
```

---

### 🚀 `importConfig(config)`

Applies a configuration object. Throws if invalid types are provided.

---

### 🔧 `setDeepMode(value)`
Sets the behavior for deep serialization and deserialization.

---

## 🧪 Type Validation

You can ensure the decrypted value matches the original type:

```js
crypto.decrypt(result, 'map'); // ✅
crypto.decrypt(result, 'set'); // ❌ throws if type mismatch
```

---

## ❗ Errors You Might See

- `Unsupported data type for encryption: Function`
- `Type mismatch: expected Map, but got Set`
- `Invalid config JSON file`
- `HTMLElement deserialization is only supported in browsers`

---

## 🛡️ Security Notice

This utility is for learning and light usage. For production, ensure:

- Proper key management (use secure vaults)
- Safe IV reuse (IVs must be unique per encryption)
- Your platform's crypto standards are followed
