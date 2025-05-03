# ✨ TinyOlm

TinyOlm is a minimal and powerful wrapper around [Olm](https://gitlab.matrix.org/matrix-org/olm), designed to handle secure end-to-end encryption for Matrix-compatible environments — but small enough to fit in any project 🛡️

Whether you're building a chat app, a P2P network, or just need secure encryption between devices, **TinyOlm** gives you the essentials: identity management, session handling, and message encryption — all wrapped in a compact and intuitive interface.

> ⚠️ **Important:** All encryption and decryption operations are automatically **queued and executed in order** using an internal `TinyPromiseQueue` from module `tiny-essentials`.  
> This ensures that all cryptographic requests are **processed in the correct sequence**, so you don't need to handle the ordering manually.

---

## 🚀 Features

- 🔐 Identity & Device Key Management  
- 🔄 One-Time & Session Key Generation  
- 📦 Lightweight API for encrypting/decrypting messages  
- 🧪 Supports both structured and raw message formats  
- 🔌 Fully compatible with Olm (WebAssembly)  

---

## 🔐 Basic Encryption

```js
const encrypted = tinyOlm.encrypt('alice', { hello: 'world' });
```

## 🔓 Basic Decryption

```js
const message = tinyOlm.decrypt('alice', 1, encrypted.body);
```

---

## 🛠️ How to Use

TinyOlm works through a class-based instance system. Every device gets its own `TinyOlm.Instance`, which manages your encryption identity, sessions, and storage 🔐

### ✅ Step-by-step Setup

#### 1. Import and create your instance

```js
import { TinyOlm } from 'tiny-crypto-suite';

const olm = new TinyOlm.Instance('@pudding', 'DEVICE123', 'optional-password');
```

#### 2. Initialize the library and create your account

```js
await olm.init(); // Load Olm and create a new identity
```

#### 3. (Optional) Load saved sessions from IndexedDB

```js
await olm.initIndexedDb(); // Load identity + restore sessions from the browser
```

---

### 🧪 Basic Encryption

To encrypt any message or object:

```js
const encrypted = olm.encrypt('@friend', { hello: '🌍' });
```

This returns:

```js
{
  type: 1,
  body: 'ENCRYPTED_PAYLOAD'
}
```

---

### 🧩 Basic Decryption

To decrypt a received message:

```js
const message = olm.decrypt('@friend', 1, encrypted.body);
console.log(message); // → { hello: '🌍' }
```

You can also decrypt raw plaintexts (from `encryptMessage`) or expect a specific type for validation.

---

### 🧠 What's Stored?

Once `initIndexedDb()` is called, TinyOlm automatically stores and restores:

- Your account identity
- One-to-one sessions
- Group sessions (inbound + outbound)

Making it a persistent and browser-safe encryption solution 💾🔐
