# ✨ Tiny Cert Crypto

A lightweight 🔐 utility for managing, generating, and handling **X.509 certificates** and **RSA key pairs**.  
Built with flexibility in mind — runs seamlessly in both **Node.js** and **browser** environments! 🌍

---

## 📦 Features

- 🛠️ RSA key pair generation (**Node.js only**)
- 🧾 Self-signed X.509 certificate creation
- 🧬 Support for PEM-based 🔑 public/private keys and certificates
- 🧊 JSON encryption & decryption using Base64 encoding
- 🕵️ Metadata extraction from certificates (issuer, subject, validity, etc.)
- 📁 Flexible key loading: from memory, local files (Node.js), or URLs (browser)

---

## 🚀 Getting Started

### 📚 Constructor

```js
const instance = new TinyCertCrypto({
  publicCertPath: 'cert.pem',          // Path to public cert (Node.js)
  privateKeyPath: 'key.pem',           // Path to private key (Node.js)
  publicCertBuffer: null,              // String or Buffer in memory (Node.js/browser)
  privateKeyBuffer: null,              // String or Buffer in memory (Node.js/browser)
  cryptoType: 'RSA-OAEP',              // Encryption algorithm (default: 'RSA-OAEP')
});
```

> 🔍 In **browser environments**, at least `publicCertPath` or `publicCertBuffer` must be provided.

---

## 🧪 Core Methods

### 🔧 `async init()`
Initializes the certificate and key system from files, memory buffers, or URLs.

- Loads the public certificate/key.
- Optionally loads the private key.
- Detects whether you’re running in Node.js or the browser and adjusts behavior accordingly.

---

### 🔥 `startCrypto(tinyCrypto?)`

Starts the internal TinyCrypto instance.

- If an internal TinyCrypto instance is already set, an error will be thrown to prevent overriding it.
- If no instance is provided, a new one will be automatically created.

| Parameter   | Type        | Description                                           |
| ----------- | ----------- | ----------------------------------------------------- |
| `tinyCrypto` | `TinyCrypto` | *(Optional)* The TinyCrypto instance to initialize. |

| Throws       | Description |
| ------------ | ----------- |
| `Error` | If the TinyCrypto instance has already been set. |

---

### 📦 `getCrypto()`

Returns the previously loaded TinyCrypto instance.

- Assumes the module has already been started using `startCrypto()`.

| Returns | Type        | Description               |
| ------- | ----------- | ------------------------- |
|         | `TinyCrypto` | The TinyCrypto module instance. |

| Throws       | Description |
| ------------ | ----------- |
| `Error` | If the TinyCrypto instance is `undefined` or `null`, meaning it was not properly started. |

---

### 🔐 `existsCrypto()`

Checks if the `TinyCrypto` instance has been set.

This method returns `true` if the `TinyCrypto` module has been assigned and is not `null`, otherwise it returns `false`.

```js
const cryptoExists = instance.existsCrypto();
```

#### Returns:
- **`true`**: If the `TinyCrypto` module exists and has been properly set.
- **`false`**: If the `TinyCrypto` module is not set or is `null`.

#### Example:

```js
if (instance.existsCrypto()) {
  console.log("TinyCrypto instance is available.");
} else {
  console.log("TinyCrypto instance is not set.");
}
```

This method is useful for checking the availability of the `TinyCrypto` instance before performing cryptographic operations.

---

### 📑 `extractCertMetadata()`
Returns parsed metadata from the loaded certificate.

```js
{
  subject: { names: {}, shortNames: {}, raw: "CN=example.com,O=MyOrg" },
  issuer: { names: {}, shortNames: {}, raw: "CN=example.com,O=MyOrg" },
  serialNumber: '...',
  validFrom: Date,
  validTo: Date
}
```

---

### 🛡️ `encryptJson(jsonObject)`
Encrypts a JavaScript object using the loaded **public key**, returning a **Base64-encoded string**.

```js
const encrypted = instance.encryptJson({ hello: "world" });
```

---

### 🔓 `decryptToJson(base64String)`
Decrypts a Base64 string using the **private key**, returning the original JSON object.

```js
const json = instance.decryptToJson(encrypted);
```

---

### 🛡️ `encrypt(data)`

Encrypts a value and returns a **Base64-encoded string**.

```js
const result = instance.encrypt('Hello!');
```

---

### 🔓 `decrypt(data, expectedType?)`

Decrypts a previously encrypted value and returns the original data. You can optionally pass an `expectedType` to validate it.

```js
const plain = instance.decrypt(result, 'string');
```

---

### 🛡️ `encryptWithoutKey(data)`

Encrypts a value and returns a **Base64-encoded string**.

```js
const result = instance.encryptWithoutKey('Hello!');
```

#### Behavior:
- The data is encrypted without the AES key.
- The returned result is a Base64-encoded string, similar to the regular `encrypt()` function.
- This method is suitable when you wish to use a different encryption method.

---

### 🔓 `decryptWithoutKey(data, expectedType?)`

Decrypts a previously encrypted value and returns the original data. You can optionally pass an `expectedType` to validate it.

```js
const plain = instance.decryptWithoutKey(result, 'string');
```

#### Behavior:
- The data is decrypted using the internal AES key.
- You can pass an optional `expectedType` to ensure the decrypted value matches the expected type, similar to the regular `decrypt()` function.
- This method is suitable when you wish to use a different encryption method.

---

### 🔧 `setDeepMode(value)`
Sets the behavior for deep serialization and deserialization in the TinyCrypto instance.

---

### 🔍 `hasKeys()`
Returns `true` if both `publicKey` and `privateKey` are loaded.

---

### 📜 `hasCert()`
Returns `true` if a certificate (`publicCert`) is loaded.

---

### ♻️ `reset()`
Resets the internal state, clearing:
- `publicKey`
- `privateKey`
- `publicCert`
- `metadata`
- `source`

---

### 📦 `fetchNodeForge()` & `getNodeForge()`
Handles lazy-loading and reuse of the `node-forge` module.

Use if you want to access Forge directly without importing it yourself:

```js
const forge = await instance.fetchNodeForge();
```

---

## 🧠 Internals & Design

- 🔍 Uses regular expressions to detect PEM types (`CERTIFICATE`, `PUBLIC KEY`, `PRIVATE KEY`)
- 🧪 Automatically parses PEM buffers and files depending on the runtime
- 🔐 Encrypts data with the selected algorithm (`RSA-OAEP`, etc.)
- 🧬 X.509 certificate metadata extraction is done via `node-forge`

---

## 🧰 Requirements

| Environment | Requirement        |
|-------------|--------------------|
| Node.js     | `node-forge` |
| Browser     | Works with native `fetch()` and `TextDecoder` |

---

## 😺 Example Use Case

```js
const crypto = new TinyCertCrypto({ publicCertPath: 'cert.pem', privateKeyPath: 'key.pem' });
await crypto.init();

const data = { secret: 'I love ponies' };
const encrypted = crypto.encryptJson(data);
const decrypted = crypto.decryptToJson(encrypted);

console.log(decrypted); // { secret: 'I love ponies' }
```

---

### 🧾 `async generateX509Cert(subjectFields, options = {})`
Generates a new **RSA key pair** and a **self-signed X.509 certificate** using the provided subject information.

🔐 This is ideal for internal services, development environments, or cryptographic testing tools where a trusted CA is not required.

---

**🧬 Parameters:**

- `subjectFields` (`Object`) – Describes the identity fields that will be embedded into the certificate's subject and issuer:
  - Common fields include:
    - `CN`: Common Name (e.g. domain or hostname)
    - `O`: Organization Name
    - `OU`: Organizational Unit
    - `L`: Locality (City)
    - `ST`: State or Province
    - `C`: Country (2-letter code)
    - `emailAddress`: Optional email field

- `options` (`Object`) – Optional configuration:
  - `keySize` (`number`) – RSA key size in bits (default: `2048`)
  - `validityInYears` (`number`) – Certificate validity period (default: `1`)
  - `randomBytesLength` (`number`) – Length of the serial number (default: `16`)
  - `digestAlgorithm` (`string`) – Digest algorithm used to sign the certificate (default: `'sha256'`)
  - `forgeInstance` (`object`) – Optionally inject a specific instance of `node-forge`
  - `cryptoType` (`string`) – Encryption scheme used for later operations (e.g., `'RSA-OAEP'`, `'RSAES-PKCS1-V1_5'`)

---

**✅ Returns:**

An object containing all the generated artifacts:

```js
{
  publicKey: '-----BEGIN PUBLIC KEY-----...',
  privateKey: '-----BEGIN PRIVATE KEY-----...',
  cert: '-----BEGIN CERTIFICATE-----...'
}
```

- `publicKey`: The newly generated **PEM-encoded RSA public key**
- `privateKey`: The corresponding **PEM-encoded RSA private key**
- `cert`: A **PEM-encoded X.509 certificate** that is **self-signed** with the private key and matches the provided subject

---

**📌 Notes:**

- 🔄 The `subject` and `issuer` of the certificate are the same (self-signed).
- ⏳ The certificate `validFrom` is set to the current date, and `validTo` is based on the `validityInYears` option.
- 🔢 A secure random `serialNumber` is generated using `node-forge`.
