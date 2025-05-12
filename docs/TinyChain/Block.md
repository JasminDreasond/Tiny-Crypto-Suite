# 📦 `Block` – The Core Unit of TinyChain

A `Block` in TinyChain represents a single unit of immutable data added to the chain. Each block contains transaction data, cryptographic signatures, a timestamp, a reference to the previous block, and gas-related configuration.

Blocks are fundamental to the structure and security of the blockchain. They ensure data consistency, integrity, and trust through signature validation, hash linking, and mining mechanisms.

---

## 🧱 Constructor: `new Block(options)`

Creates a new instance of a blockchain block with all the required metadata, transaction records, and gas settings.

```js
new Block({
  time,
  index,
  data,
  txs,
  sigs,
  chainId,
  prevHash,
  diff,
  baseFeePerGas,
  reward,
  nonce,
  miner,
  payloadString,
  signer,
  parser,
  hash,
  firstValidation,
})
```

### 🧾 Parameters

| Name              | Type                     | Description                                                                    |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `time`            | `number`                 | Unix timestamp (in milliseconds) of block creation.                            |
| `index`           | `bigint \| string`       | The block number in the chain.                                                 |
| `data`            | `TransactionData[]`      | The list of transaction objects inside the block.                              |
| `txs`             | `Record<string, number>` | Optional transaction index mapping.                                            |
| `sigs`            | `Record<string, string>` | Optional map of cryptographic signatures for each transaction.                 |
| `chainId`         | `bigint \| string`       | The unique identifier of the blockchain instance.                              |
| `prevHash`        | `string`                 | Hash of the previous block (used for chaining).                                |
| `diff`            | `bigint \| string`       | Difficulty level of the block (mining-related).                                |
| `baseFeePerGas`   | `bigint \| string`       | Base gas price used to calculate transaction fees.                             |
| `reward`          | `bigint \| string`       | The reward paid to the miner of the block.                                     |
| `nonce`           | `bigint \| string`       | The nonce used for mining the block.                                           |
| `miner`           | `string \| null`         | The address of the block's miner (if any).                                     |
| `payloadString`   | `boolean`                | Whether payloads should be kept as strings (default: `true`).                  |
| `signer`          | `TinySecp256k1`          | ECDSA signer used for signature validation.                                    |
| `parser`          | `TinyCryptoParser`       | Parser used for serialization and hashing.                                     |
| `hash`            | `string \| null`         | Precomputed hash of the block. If not provided, it's calculated automatically. |
| `firstValidation` | `boolean`                | Whether to validate signatures on construction (default: `true`).              |

### ❗ Errors Thrown

This constructor performs **strict type validation** and will throw descriptive errors if any required property is of the wrong type or if the data is invalid.

---

## 🧪 `validateSig()`

Validates all ECDSA signatures inside the block. Each transaction must be signed correctly by its sender.

```js
block.validateSig();
```

### 🔍 Behavior

* Loops through all transactions and signatures.
* Serializes each transaction.
* Uses the `TinySecp256k1` signer to validate against the address.
* Throws an error if any signature is invalid or if an address is in the `invalidAddress` map.

---

## 🛑 `stopMining()`

Gracefully stops the mining process of a block.

```js
block.stopMining();
```

### 🔧 Usage

If you're running an asynchronous mining loop (e.g., in a Web Worker or async loop), calling `stopMining()` will set an internal flag that signals the miner to stop execution at the next opportunity.

This is helpful for cancellation or reconfiguration scenarios.

---

## 📤 `export()`

Serializes the current block instance to a string using the configured parser.

```js
const exported = block.export();
```

### 📦 Output

* Returns a deep stringified representation of all public block data.
* Uses the `TinyCryptoParser.serializeDeep()` method internally.
* Safe to store or transmit to other peers or clients.

---

## 📬 `get()`

Returns a plain object containing **only** the public data of the block.

```js
const data = block.get();
```

### 🔍 Output Shape

```js
{
  chainId: bigint,
  index: bigint,
  time: number,
  data: TransactionData[],
  baseFeePerGas: bigint,
  prevHash: string,
  diff: bigint,
  nonce: bigint,
  hash: string,
  reward: bigint,
  miner: string | null,
  txs: Record<string, number>,
  sigs: Record<string, string>,
}
```

This is especially useful when you want to work with or inspect the contents of the block without exposing private methods or internals.

---

## 🧮 `calculateHash()`

Computes the hash of the block based on its current contents.

```js
const hash = block.calculateHash();
```

### 🔐 Behavior

* Combines the timestamp, previous hash, serialized data, signature list, index, gas data, nonce, and chain ID.
* Uses SHA-256 to compute a deterministic hash.
* The result is stored or compared as the block's ID.

### 🧊 Example

```js
block.calculateHash(); // "e59cc8...7a32"
```

The output is a `hex` string of the resulting SHA-256 digest.

---

## 🧾 `generateTxId(index)`

Generates a unique SHA-256 transaction ID for the item at the given index in the block's data.

```js
const txId = block.generateTxId(0);
```

### 🔒 Requirements

* The data must be an array.
* The index must be within bounds.

### ❗ Throws

* `Error` if the index is not a valid number.
* `Error` if the data is not an array or the index is invalid.

---

## ⛏️ `mine(minerAddress?, options?)`

Performs the mining loop asynchronously until a valid hash is found.

```js
await block.mine("0xMinerAddress", {
  prevHash: "abcd1234",
  index: 2n,
  onProgress: (hashrate) => console.log(hashrate),
  onComplete: (finalHashrate) => alert(finalHashrate),
});
```

### 🛠️ Options

* `prevHash`: string (default: `"0"`)
* `index`: bigint (default: `0n`)
* `onProgress`: function (optional, receives hashrate updates)
* `onComplete`: function (optional, called when mining succeeds)

### 🎯 Output

```js
{
  nonce: bigint,
  hash: string,
  success: boolean
}
```

### ❗ Throws

* `Error` if the miner address is not a valid non-empty string.

---

## 📑 `getTxs()`

Returns the internal transaction ID map of the block.

```js
const txs = block.getTxs();
```

### 🔍 Output

A plain object mapping transaction IDs to their index in `data`.

### ❗ Throws

* `Error` if the internal map is not valid.

---

## 🔎 `getTx(txId)`

Fetches a transaction from `data` by its hashed transaction ID.

```js
const tx = block.getTx("aabbccdd...");
```

### ❗ Throws

* `Error` if the transaction ID does not exist.

---

## 🔐 `getParser()`

Returns the parser instance responsible for serialization.

```js
const parser = block.getParser();
```

### ❗ Throws

* `Error` if the parser is not a valid instance.

---

## ✍️ `getSigner()`

Returns the signer instance for signing and verifying.

```js
const signer = block.getSigner();
```

---

## 📊 Block Metadata Accessors

Simple getters that return validated internal values:

```js
block.getTime();         // ⏱️ number
block.getIndex();        // 🔢 bigint
block.getChainId();      // 🆔 bigint
block.getPrevHash();     // 🔗 string|null
block.getDiff();         // 💪 bigint
block.getReward();       // 💰 bigint
block.getNonce();        // 🎲 bigint
block.getMiner();        // 🧑‍🚀 string|null
block.getData();         // 📦 TransactionData[]
block.getSigs();         // ✍️ SignIndexMap
block.getHash();         // 🧬 string
block.getBaseFeePerGas();// ⛽ bigint
```

All of them include internal validation to ensure type safety and correctness.
