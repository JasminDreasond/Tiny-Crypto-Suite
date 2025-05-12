# 🛠️ `TinySecp256k1` Class

A minimal wrapper around the `secp256k1` elliptic curve cryptography using the `elliptic` library. 🔐

## 🌟 Overview

The `TinySecp256k1` class is a lightweight and modular elliptic curve handler focused on supporting Bitcoin 💰 and Ethereum-style cryptographic signatures. It is designed for environments where you want lazy loading, minimal dependencies, and easy key management for `secp256k1` operations. ⚡

## ✨ Features

* Generates or imports a private key 🔑
* Supports SHA-256, double SHA-256, and RIPEMD160(SHA256(x)) hashing 🧮
* Can sign and verify messages using ECDSA 🖊️
* Allows recoverable 65-byte signatures 📜
* Enables public key recovery from signatures 🔍
* Lazy-loads the `elliptic` library for efficiency 🚀

---

## ⚙️ Installation

Make sure the [`elliptic`](https://www.npmjs.com/package/elliptic) library is installed:

```bash
npm install elliptic
```

---

## 🛠️ Constructor

```js
new TinySecp256k1({
  type: 'bitcoin',
  prefix: '1',
  msgPrefix: 'My Signed Message:\n',
  privateKey: 'a1b2c3...',
  privateKeyEncoding: 'hex'
})
```

### 📋 Options:

| Option               | Type     | Default                         | Description                                      |
| -------------------- | -------- | ------------------------------- | ------------------------------------------------ |
| `type`               | `string` | `null`                          | Optional crypto type identifier.                 |
| `prefix`             | `string` | `null`                          | Optional address prefix used in verification.    |
| `msgPrefix`          | `string` | `"Tinychain Signed Message:\n"` | Prefix for message signing.                      |
| `privateKey`         | `string` | `randomBytes(32)`               | The private key as string, if already generated. |
| `privateKeyEncoding` | `string` | `"hex"`                         | Encoding of the private key.                     |

---

## 📡 Static Methods

### `TinySecp256k1.sha256(buffer: Buffer): Buffer`

Returns the SHA-256 hash of the buffer. 🔍

---

### `TinySecp256k1.doubleSha256(buffer: Buffer): Buffer`

Returns the SHA-256 of the SHA-256 of the buffer (commonly used in Bitcoin). 🔄

---

### `TinySecp256k1.hash160(buffer: Buffer): Buffer`

Returns the RIPEMD160(SHA256(buffer)) hash used for Bitcoin address creation. 💳

---

## 💼 Instance Methods

### `init(): Promise<KeyPair>`

Initializes the internal elliptic key pair using the private key. 🔑

---

### `getKeyPair(): KeyPair`

Returns the initialized elliptic key pair. Must call `init()` first. ⚙️

---

### `getEc(): ec`

Returns the `secp256k1` EC instance. Throws if uninitialized. ❌

---

### `getElliptic(): Elliptic`

Returns the `elliptic` module reference. Throws if uninitialized. ⚠️

---

### `getMsgPrefix(): string`

Returns the current message prefix. ✉️

---

### `getPrefix(): string`

Returns the address prefix. 📌

---

### `getType(): string`

Returns the crypto type. 💻

---

### `getPrefixType(address: string): string | null`

Returns the registered crypto type that matches a given address prefix. 🧭

---

### `isType(type: string): boolean`

Checks if a crypto type is registered. ✅

---

### `isPrefix(type: string): boolean`

Checks if a prefix is registered. 📜

---

## 🔐 Internal Fields

| Field       | Type                    | Description                             |
| ----------- | ----------------------- | --------------------------------------- |
| `types`     | `Record<string,string>` | Registered types and their prefixes.    |
| `prefixes`  | `Record<string,string>` | Registered prefix values.               |
| `msgPrefix` | `string`                | The message prefix used in signing.     |
| `prefix`    | `string`                | Prefix used for address detection.      |
| `type`      | `string`                | Type name (e.g., 'btc', 'eth').         |
| `elliptic`  | `any`                   | Loaded elliptic module instance.        |
| `ec`        | `ec`                    | Instance of `elliptic.ec`.              |
| `keyPair`   | `KeyPair`               | The internal key pair once initialized. |

---

## 📝 Notes

* The class will warn if `elliptic` is not installed. ⚠️
* It is safe to instantiate multiple instances with different keys. 🔄
* It supports both compressed and uncompressed public keys. 🔑
* Signature and recovery methods are part of this class but not listed yet in this doc (you can ask to add them next). ✍️

---

### Method: `validateAddress(address, type = this.getType())`
Validates the given address and checks if it matches a known type. ✅

- **Parameters:**
  - `address` (`string`): The address string to validate. 📬
  - `type` (`string`, optional): The type of address to check against. Defaults to the value set in `this.getType()`. 🔍

- **Returns:**
  - `ValidationResult`: An object containing:
    - `valid` (`boolean`): Indicates whether the address is valid. ✔️
    - `type` (`string|null`): The address type if valid, otherwise `null`. ❌

- **Throws:**
  - Throws an error if the address is not a string. 🚨

### Method: `getPrivateKeyHex()`
Returns the private key in hexadecimal format. 🔐

- **Returns:**
  - `string`: The private key as a hexadecimal string. 💎

### Method: `getPublicKeyBuffer(compressed = true)`
Returns the public key in a buffer format, with an option to return the compressed version of the key. 🔑

- **Parameters:**
  - `compressed` (`boolean`, optional): Whether to return the compressed version of the public key. Defaults to `true`. 🔒

- **Returns:**
  - `Buffer`: The public key as a buffer. 📦

### Method: `getPublicKeyHex(compressed = true)`
Returns the public key in hexadecimal format, with an option to return the compressed version. 💾

- **Parameters:**
  - `compressed` (`boolean`, optional): Whether to return the compressed version of the public key. Defaults to `true`. 🔑

- **Returns:**
  - `string`: The public key as a hexadecimal string. 💡

### Method: `getPubVanillaAddress(compressed = true)`
Returns the public address derived from the public key in a vanilla (hash160) format. 📬

- **Parameters:**
  - `compressed` (`boolean`, optional): Whether to return the compressed version of the public key. Defaults to `true`. 💾

- **Returns:**
  - `Buffer`: The hash160 representation of the public key. 🔑

### Method: `addressToVanilla(address, type = this.getType())`
Returns the hash160 representation of an address in vanilla format. 🧭

- **Parameters:**
  - `address` (`string`): The address to convert. 🔄
  - `type` (`string`, optional): The type of address. Defaults to the current instance's type. ⚙️

- **Returns:**
  - `Buffer`: The hash160 representation of the public key from the address. 📡

### Method: `getAddress(pubKey = this.getPublicKeyBuffer(), type = this.getType())`
Generates the public address derived from the public key. 🏠

- **Parameters:**
  - `pubKey` (`Buffer`, optional): The public key to derive the address from. Defaults to the current instance's public key. 🔑
  - `type` (`string`, optional): The type of address to generate. Defaults to the current instance's type. 🧭

- **Returns:**
  - `string`: The generated public address. 🌐

### Method: `signECDSA(message, encoding = 'utf8')`
Signs a message using the ECDSA algorithm and returns the DER-encoded signature. 🖋️

- **Parameters:**
  - `message` (`string|Buffer`): The message to sign. 📝
  - `encoding` (`BufferEncoding`, optional): The encoding if the message is a string. Defaults to `utf8`. 🗣️

- **Returns:**
  - `Buffer`: The DER-encoded signature buffer. 📜

### Method: `verifyECDSA(message, signatureBuffer, pubKeyHex, encoding)`
Verifies an ECDSA signature against a given message and public key. ✅
- **Parameters:**
  - `message` (`string|Buffer`): The message to verify. 📝
  - `signatureBuffer` (`Buffer`): The signature buffer to verify. 🔏
  - `pubKeyHex` (`string`): The public key in hexadecimal format. 🔑
  - `encoding` (`BufferEncoding`, optional): The encoding if the message is a string. 🗣️

- **Returns:**
  - `boolean`: `true` if the signature is valid, otherwise `false`. ❌

### Method: `validateAddress(address, type = this.getType())`
Validates an address and checks whether it matches the type specified in the current instance or the type passed as a parameter. 🔍

- **Parameters:**
  - `address` (`string`): The address to validate. 📬
  - `type` (`string`, optional): The type of address to check against. Defaults to the instance's current type. ⚙️

- **Returns:**
  - `ValidationResult`: An object with:
    - `valid` (`boolean`): Indicates whether the address is valid. ✔️
    - `type` (`string|null`): The type of the address if valid. 📝

- **Throws:**
  - Throws an error if the address parameter is not a string. 🚨

## 📚 Example Usage:

Here is an example of how to use the `TinySecp256k1` class to generate a private/public key pair, sign a message, and verify the signature:

```js
const signer = new TinySecp256k1({
  msgPrefix: 'MyApp Signed Message:\n',
  privateKey: 'a1b2c3...',
  privateKeyEncoding: 'hex'
});

await signer.init();

// Sign a message
const message = 'Hello, world!';
const signature = signer.signECDSA(message);

// Verify the signature
const isValid = signer.verifyECDSA(message, signature, pubKey);
console.log('Signature valid:', isValid);
```

## 📌 Additional Notes:

* This implementation uses the `secp256k1` elliptic curve, which is widely used in cryptocurrencies like Bitcoin 💰 and Ethereum 🌐.
* Lazy loading is used for the `elliptic` library to minimize dependencies and improve performance 🚀.
* The message prefix used in signing and verifying is customizable, and it follows formats commonly used in Bitcoin and Ethereum. 📜

For more information about `elliptic` or `secp256k1`, refer to the official documentation of these libraries. 📚
