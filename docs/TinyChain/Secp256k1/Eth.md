# 📄 Documentation for `TinyEthSecp256k1` class

This document provides a detailed overview of the `TinyEthSecp256k1` class, which extends the `TinySecp256k1` class to add Ethereum-specific functionality. It supports key generation, message signing, address generation, and validation using Ethereum's `keccak256` hash function.

## 🧩 Class: `TinyEthSecp256k1`

### 🧬 Inherits from:

* `TinySecp256k1`

### 🛠️ Constructor

```javascript
constructor({
  prefix = '0x',
  msgPrefix = '\x19Ethereum Signed Message:\n',
  privateKey = null,
  privateKeyEncoding = 'hex',
} = {})
```

---

### 🧾 Parameters:

* **prefix** (`string|null`, default `'0x'`): The prefix to use for Ethereum addresses during message verification.
* **msgPrefix** (`string|null`, default `'\x19Ethereum Signed Message:\n'`): The prefix added to messages when signing.
* **privateKey** (`string|null`, default `null`): The private key used to initialize the elliptic curve key pair.
* **privateKeyEncoding** (`BufferEncoding`, default `'hex'`): The encoding of the private key string.

This constructor sets up the class by inheriting properties and methods from `TinySecp256k1`, and initializes Ethereum-specific parameters like address prefix and message prefix.

### 🧪 Methods

---

### 🚀 `async init()`

```javascript
async init()
```

* **Returns**: `Promise<KeyPair>`: The elliptic curve key pair initialized with the private key.

This method initializes the internal elliptic key pair and loads necessary modules (`elliptic`, `js-sha3`).

---

### 📦 `async fetchJsSha3()`

```javascript
async fetchJsSha3()
```

* **Returns**: `Promise<JsSha3>`: The dynamically imported `js-sha3` module.

This method ensures that the `js-sha3` module is loaded only once and provides a reference to it.

---

### 📥 `getJsSha3()`

```javascript
getJsSha3()
```

* **Returns**: `JsSha3`: The loaded `js-sha3` module.
* **Throws**: `Error` if `js-sha3` is not initialized.

This method returns the initialized `js-sha3` instance and throws an error if it isn't loaded correctly.

---

### 🔑 `getPublicKeyHex()`

```javascript
getPublicKeyHex()
```

* **Returns**: `string`: The public key in hexadecimal format.

This method returns the public key in hexadecimal format.

---

### 🏷️ `getAddress(pubKey = this.getPublicKeyBuffer(false))`

```javascript
getAddress(pubKey)
```

* **Parameters**:

  * **pubKey** (`Buffer`, optional): The public key buffer (defaults to the public key of the instance).
* **Returns**: `string`: The Ethereum address derived from the public key.

This method generates the Ethereum address from the provided or default public key.

---

### 📤 `getPubVanillaAddress()`

```javascript
getPubVanillaAddress()
```

* **Returns**: `Buffer`: The public key address in the raw (vanilla) format.

This method returns the public key address in the raw format (Hash160 representation).

---

### 🔄 `addressToVanilla(address)`

```javascript
addressToVanilla(address)
```

* **Parameters**:

  * **address** (`string`): The Ethereum address to convert.
* **Returns**: `Buffer`: The Ethereum address in vanilla format.

This method returns the Ethereum address in vanilla format (Hash160 representation).

---

### ✅ `validateAddress(address, type = this.getType())`

```javascript
validateAddress(address, type)
```

* **Parameters**:

  * **address** (`string`): The address to validate.
  * **type** (`string`, optional): The address type (defaults to `keccak256`).
* **Returns**: `ValidationResult`: An object with `valid` (boolean) and `type` (string) properties indicating whether the address is valid.

This method validates whether the provided Ethereum address is valid and conforms to the checksum format.

---

### ✍️ `signMessage(message, options = {})`

```javascript
signMessage(message, options)
```

* **Parameters**:

  * **message** (`string|Buffer`): The message to sign.
  * **options** (`Object`, optional):

    * **encoding** (`BufferEncoding`, optional): The encoding for the input message if it's a string.
    * **prefix** (`string`, optional): The prefix to use when signing the message (defaults to the instance's prefix).

* **Returns**: `Buffer`: The Ethereum message signature.

This method signs a message using Ethereum's signing prefix and returns the resulting signature.

---

### 🕵️ `recoverMessage(message, signature, options = {})`

```javascript
recoverMessage(message, signature, options)
```

* **Parameters**:

  * **message** (`string|Buffer`): The original message to recover.
  * **signature** (`string|Buffer`): The signature to recover the address from.
  * **options** (`Object`, optional):

    * **encoding** (`BufferEncoding`, optional): The encoding for the input message if it's a string.
    * **prefix** (`string`, optional): The prefix to use when recovering the address (defaults to the instance's prefix).

* **Returns**: `string|null`: The recovered Ethereum address, or `null` if recovery failed.

This method recovers the Ethereum address from a signed message and its corresponding signature.

---

### 📚 Dependencies:

* `elliptic`: For elliptic curve cryptography.
* `js-sha3`: For generating keccak256 hashes.

Make sure to install the required dependencies using:

```bash
npm install elliptic js-sha3
```
