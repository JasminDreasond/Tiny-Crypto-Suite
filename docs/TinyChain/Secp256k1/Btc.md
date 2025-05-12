# 📘 `TinyBtcSecp256k1` – Bitcoin Key & Address Toolkit Built on `TinySecp256k1`

`TinyBtcSecp256k1` is an advanced Bitcoin-oriented wrapper class built on top of the generic `TinySecp256k1`. It enables easy management of private/public keys and address generation for Bitcoin (`p2pkh`, `bech32`) using the `secp256k1` elliptic curve. It supports lazy-loaded modules like `bech32` and `bs58check`, ensuring lightweight usage.

---

## 🛠 Constructor

```js
new TinyBtcSecp256k1(options)
```

**Options:**

| Name                 | Type                    | Default                       | Description                                        |                                                  |
| -------------------- | ----------------------- | ----------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `type`               | `'bech32'` or `'p2pkh'` | `'bech32'`                    | Type of address to generate.                       |                                                  |
| `prefix`             | `string`                | `'bc'`                        | Network prefix (e.g., `'bc'` for Bitcoin mainnet). |                                                  |
| `msgPrefix`          | `string`                | `'Bitcoin Signed Message:\n'` | Prefix used when signing messages.                 |                                                  |
| `p2pkhPrefix`        | `number`                | `0x00`                        | Prefix used for legacy base58 addresses.           |                                                  |
| `privateKey`         | \`string                | null\`                        | `null`                                             | Optional private key to initialize the key pair. |
| `privateKeyEncoding` | `BufferEncoding`        | `'hex'`                       | Encoding used for the private key string.          |                                                  |

---

## 🔑 Key & Address Utilities

### `getP2pkhPrefix() → number`

Returns the current P2PKH prefix.

---

### `init() → Promise<KeyPair>`

Initializes the key pair using the provided private key.

---

### `getPublicKeyHex(compressed = true) → string`

Returns the public key in hexadecimal format.

---

### `getAddress(pubKey?, type?) → string`

Derives the public address from a given public key.

---

### `addressToVanilla(address, type?) → Buffer`

Returns the `hash160` (vanilla) representation of a Bitcoin address.

---

## 📦 Module Lazy Loaders

### `fetchBech32() → Promise<{ base32: Bech32, base32m: Bech32 }>`

Dynamically loads and caches the `bech32` module.

---

### `fetchBs58check() → Promise<Bs58check>`

Dynamically loads and caches the `bs58check` module.

---

### `getBech32() → Bech32`

Returns the initialized Bech32 encoder instance.

---

### `getBech32m() → Bech32`

Returns the initialized Bech32m encoder instance.

---

### `getBs58check() → Bs58check`

Returns the initialized Bs58check encoder instance.

---

## 📬 Address Converters

These methods are stored internally in private mappings (`#pubKeyTo`, `#toHash160`):

### From Public Key → Address:

* `p2pkh(pubKey: Buffer) → string`
* `bech32(pubKey: Buffer) → string`

---

### From Address → hash160:

* `p2pkh(address: string) → Buffer`
* `bech32(address: string) → Buffer`

---

## 📦 Dependencies (expected to be installed):

```bash
npm install bech32 bs58check elliptic
```

---

## ✅ Example

```js
const keyUtil = new TinyBtcSecp256k1({ privateKey: '...', type: 'p2pkh' });
await keyUtil.init();
console.log(keyUtil.getPublicKeyHex());
console.log(keyUtil.getAddress());
```
