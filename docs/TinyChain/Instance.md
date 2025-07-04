## ⛓️ `TinyChainInstance`

**Description:**
Represents a complete blockchain instance, managing block creation, mining, validation, and balance tracking in optional currency and payload modes. This class handles a dynamic and extensible blockchain environment with gas fee mechanics, custom payloads, transfer restrictions, admin controls, halving logic, and export/import capabilities.

---

### 🏗️ `constructor(options)` — Blockchain Initialization

This constructor method is responsible for setting up a brand new blockchain instance with a wide variety of customization options! 🧱✨

---

#### 📥 Parameters (inside `options` object):

* `signer` *(TinySecp256k1)*: Cryptographic signer instance.
* `chainId` *(string | number | bigint, default: 0)*: The ID of the chain.
* `transferGas` *(string | number | bigint, default: 15000)*: Symbolic gas cost per transfer.
* `baseFeePerGas` *(string | number | bigint, default: 21000)*: Base gas fee per gas unit.
* `priorityFeeDefault` *(string | number | bigint, default: 2)*: Default tip (priority fee).
* `diff` *(string | number | bigint, default: 1)*: Difficulty setting (used in validation logic).
* `payloadString` *(boolean, default: true)*: Determines if payloads are treated as strings.
* `currencyMode` *(boolean, default: false)*: Enables tracking of balances and gas costs.
* `payloadMode` *(boolean, default: false)*: Enables handling of payload content.
* `initialReward` *(string | number | bigint)*: Reward for the genesis block or first mined block.
* `halvingInterval` *(string | number | bigint, default: 100)*: Blocks before reward halving.
* `lastBlockReward` *(string | number | bigint)*: Last known block reward.
* `initialBalances` *(object, default: {})*: Predefined balances per address.
* `admins` *(array of strings, default: \[])*: List of admin public keys.
* `blockContentSizeLimit` *(number, default: -1)*: Limit for internal block content in bytes.
* `blockSizeLimit` *(number, default: -1)*: Limit for total block size in bytes.
* `payloadSizeLimit` *(number, default: -1)*: Limit for transaction payloads in bytes.

---

#### 🛡️ Validations

All provided configuration options are validated for type correctness. If any field is missing, malformed, or not of the expected type, an error is thrown immediately. 🧪❌

---

#### 🔧 Setup Tasks

After validating parameters, the constructor:

* Stores each option internally.
* Initializes key limits (`blockContentSizeLimit`, `payloadSizeLimit`, `blockSizeLimit`).
* Creates internal sets and flags (`admins`, `currencyMode`, `payloadMode`, etc).
* Converts numeric-like parameters to `BigInt` for consistency.
* Sets up initial balances if `currencyMode` is enabled.
* Calls `startBalances()` to finalize setup.

---

#### 📦 Output

A fully configured blockchain instance is ready, with gas configuration, admin privileges, balance management, and block limits — all set to run! 🚀

---

### 🧩 `addValueType(typeName, getFunction, convertFunction)`

Registers a custom value type along with its parser and converter logic. This is useful for extending how data is interpreted and serialized.

* **Parameters:**

  * `typeName` *(string)*: The name of the custom value type (e.g., `"BigInt"`, `"HexString"`).
  * `getFunction` *(function)*: A function that extracts the raw value from parsed data.
  * `convertFunction` *(function)*: A function that converts raw data into a typed object with the format:

    ```js
    { __type: string, value?: any }
    ```
* **Returns:** `any` – Return value depends on the internal `#parser.addValueType` logic.

> 🧠 This enables you to support special formats or complex serialization strategies dynamically.

---

### 🪨 `hasGenesisBlock()`

Checks whether the blockchain contains a **valid genesis block**.

A valid genesis block must satisfy the following conditions:

* `index === 0n`

* `prevHash === '0'`

* Contains **at least one** data entry

* **Returns:** `boolean` – `true` if a valid genesis block is present, `false` otherwise.

> 🌱 The genesis block is the root of your blockchain — without it, nothing can grow!
> 📛 This method ensures that your chain starts from a trusted origin point.

---

### 🏦 **`setInitialBalances(initialBalances)`**

This method sets the initial balances for the blockchain system. It validates that the `initialBalances` is an object and that each address is a valid non-empty string and each balance is a positive `bigint`.

#### ✨ **Key Features**:

* Validates the input to ensure proper data types (non-empty strings for addresses and positive `bigint` for balances).
* Emits an event when the balances are updated. 📣
* Updates the system’s initial balances with the provided data.

#### ⚠️ **Errors**:

* Throws an error if any address is invalid or any balance is not a positive `bigint`.

#### 🛠️ **Usage**:

```javascript
chain.setInitialBalances({
  '0xAddress1': 1000n,
  '0xAddress2': 500n
});
```

---

### 💰 **`getInitialBalances()`**

This method returns the current initial balances that have been set in the system by the `setInitialBalances` method. It ensures the data returned is valid.

#### ✨ **Key Features**:

* Returns the latest object mapping of addresses to their corresponding balances.
* Throws an error if the internal `initialBalances` is not a valid object.

#### ⚠️ **Errors**:

* Throws an error if `initialBalances` is not properly initialized.

#### 🛠️ **Usage**:

```javascript
const balances = chain.getInitialBalances();
console.log(balances); // { '0xAddress1': 1000n, '0xAddress2': 500n }
```

---

### 🌱 **`init(signer?)`**

Asynchronously initializes the blockchain instance by creating the genesis block. This method ensures exclusive access during initialization through a queue and emits an `Initialized` event once the genesis block is added to the chain.

#### ✨ **Key Features**:

* Initializes the blockchain by creating the genesis block.
* Ensures the setup phase is queued for exclusive access.
* Emits an event once initialization is complete. 📣

#### 🛠️ **Usage**:

```javascript
await chain.init();
```

---

### ⛽ **`estimateGasUsed(transfers, payload)`**

Simulates the gas estimation for a transaction, considering the base cost, data size, and per-transfer cost. This method mimics Ethereum's gas calculation for a more efficient blockchain setup.

#### ✨ **Key Features**:

* Estimates the gas usage based on payload and transfers.
* Handles zero and non-zero byte costs for serialization.

#### ⚠️ **Errors**:

* Throws an error if the transfers are not an array or if the payload is not a string (when required).

#### 🛠️ **Usage**:

```javascript
const gasUsed = chain.estimateGasUsed(transfers, payload);
```

---

### 🔒 **`isValid(startIndex?, endIndex?)`**

Validates the blockchain from a starting to an ending index. This ensures that each block is valid and references the previous one correctly.

#### ✨ **Key Features**:

* Validates the entire chain or a specified range of blocks.

#### 🛠️ **Usage**:

```javascript
const isValid = chain.isValid(1, 10);
console.log(isValid); // true or false
```

---

### ✅ **`isValidNewBlock(newBlock, prevBlock?)`**

Checks if a new block is valid in relation to the most recent block. This ensures block integrity before adding it to the chain.

#### ✨ **Key Features**:

* Validates the new block's relationship with the previous block.

#### 🛠️ **Usage**:

```javascript
const isValid = chain.isValidNewBlock(newBlock);
console.log(isValid); // true or false
```

---

### 🔗 **`existsPrevBlock(newBlock)`**

Checks whether a new block has a valid previous hash, ensuring that it correctly references the previous block in the chain.

#### ✨ **Key Features**:

* Ensures the new block correctly references the previous block.

#### 🛠️ **Usage**:

```javascript
const exists = chain.existsPrevBlock(newBlock);
console.log(exists); // true or false
```

---

### 🎁 **`getCurrentReward()`**

Calculates the current block reward based on the chain's height and halving intervals. The reward decreases over time according to predefined rules.

#### ✨ **Key Features**:

* Returns the current block reward.
* Reward is halved at specified intervals.

#### 🛠️ **Usage**:

```javascript
const reward = chain.getCurrentReward();
console.log(reward); // current block reward
```

---

### 🛠️ **`validateContent(options)`**

Validates the transaction content before inclusion in the block. This method checks the payload format, transfer structure, gas constraints, and address validity.

#### ✨ **Key Features**:

* Validates transaction payload, transfers, and address.
* Ensures gas parameters are within limits and that no size constraints are exceeded.

#### ⚠️ **Errors**:

* Throws errors if the payload, transfers, gas parameters, or address are invalid.
* Throws an error if the gas used exceeds the limit.

#### 🛠️ **Usage**:

```javascript
const gasUsed = chain.validateContent({
  payload,
  transfers,
  gasLimit,
  maxFeePerGas,
  maxPriorityFeePerGas,
  address,
  addressType,
});
console.log(gasUsed); // returns estimated gas used
```

---

### 📦 `createBlockContent(options)`

Creates a new block content for the blockchain with the provided transaction data and gas options. 🚀

* **Validates the address**: Ensures the signer address is valid.
* **Estimates gas usage**: Calculates the necessary gas for the transactions.
* **Ensures gas limit compliance**: Verifies that the gas limit is not exceeded.
* **Handles reward information**: If `currencyMode` is enabled, reward data is included.

#### Parameters:

* `options` *(Object)* - Configuration options for the block.

  * `signer` *(TinySecp256k1)* - The address executing the block (default: `this.#signer`).
  * `payload` *(string)* - The block's payload (default: `''`).
  * `transfers` *(Array<Transaction>)* - List of transfers (default: `[]`).
  * `gasOptions` *(GasConfig)* - Optional gas-related configuration (default: `{}`).

#### Returns:

* **BlockContent**: The newly created block content.

#### Throws:

* **Error**: If the `execAddress` is invalid or gas limit is exceeded.

---

### ⛓️ `createBlock(content, signer?)`

Creates a new blockchain block from signed content payloads. 🛠️

* **Aggregates multiple `BlockContent` objects**: Combines transaction data and signatures into a block.
* **Handles rewards**: Includes optional reward data when operating in `currencyMode`.
* **Computes current difficulty**: Calculates the block's difficulty at creation.

#### Parameters:

* `content` *(BlockContent\[])* - Array of signed block content objects.
* `signer` *(TinySecp256k1)* - The address executing the block (default: `this.#signer`).

#### Returns:

* **TinyChainBlock**: The newly created block instance, ready for the blockchain.

#### Throws:

* **Error**: If `content` is not a non-empty array or contains invalid data.

---

### ⛏️ `mineBlock(minerAddress, newBlock)`

Mines a new block and adds it to the blockchain after validating and updating balances. 🏗️

* **Validates the block**: Ensures correctness with `isValidNewBlock()`.
* **Updates balances**: Adjusts balances if `currencyMode` or `payloadMode` is enabled.
* **Adds the block**: Finalizes and appends the mined block to the chain.

#### Parameters:

* `minerAddress` *(string)* - The address of the miner.
* `newBlock` *(TinyChainBlock)* - The new block to be mined.

#### Emits:

* `NewBlock`: Triggered when the new block is added.

#### Returns:

* **Promise<TinyChainBlock>**: Resolves to the mined block once added to the blockchain.

#### Throws:

* **Error**: If mining fails or the block is invalid.

---

### ➕ `addMinedBlock(minedBlock)`

Adds a pre-mined block to the blockchain after validating and updating balances. 📥

* **Validates the block**: Ensures the block's structure and hash are correct.
* **Updates balances**: Adjusts balances if `currencyMode` or `payloadMode` is enabled.
* **Appends the block**: Adds the validated block to the chain.

#### Parameters:

* `minedBlock` *(TinyChainBlock)* - The pre-mined block to be added.

#### Emits:

* `NewBlock`: Triggered when the new block is added.

#### Returns:

* **Promise<TinyChainBlock>**: Resolves to the block once added.

#### Throws:

* **Error**: If the block is invalid or balance update fails.

---

### 🔼 `getFirstBlock()`

Gets the first block in the blockchain. 🏁

* **Retrieves the first block**: Calls `getChainBlock(0)` to fetch the first block in the blockchain.

#### Returns:

* **TinyChainBlock**: The first block in the blockchain.

---

### 🔽 `getLatestBlock()`

Gets the latest block in the blockchain. 📅

* **Retrieves the most recent block**: Calls `getChainBlock(chain.length - 1)` to fetch the latest block added.

#### Returns:

* **TinyChainBlock**: The latest block in the blockchain.

---

### 💰 `startBalances()`

Initializes the `balances` object and emits events related to balance setup. 🔄

* **Resets the internal balances**: Initializes the `balances` object to an empty state.
* **Emits `BalancesInitialized` event**: Triggers when the balances are reset.
* **Handles `currencyMode`**: If enabled, populates the `balances` from the `initialBalances` mapping, converting all values to `BigInt`.

#### Emits:

* `BalancesInitialized`: When the balances object is reset.
* `BalanceStarted`: For each address initialized when in currency mode.

---

### ✅ `validateTransfers(pubKey, addressType, transfers, balances?)`

Validates a list of transfers for a transaction. 🔍

* **Validates sender and receiver addresses**: Ensures they are correctly formatted.
* **Checks sender's balance**: Verifies that the sender has enough balance for the transfer.
* **Non-admin restrictions**: Ensures non-admins can only transfer their own funds.

#### Parameters:

* `pubKey` *(string)* - The hex public key executing the transaction.
* `addressType` *(string)* - The address type executing the transaction.
* `transfers` *(NewTransaction\[])* - The list of transfers to validate.
* `balances` *(Balances)* - A mapping of addresses to their balances (default: `this.#getBalances()`).

#### Throws:

* **Error**: If the list is not an array, if any transfer is malformed, or if the sender is unauthorized or lacks balance.

---

### 🚀 `updateBalance(block, balances?, emitEvents?)`

#### Updates the balances of addresses involved in the block, including gas fees and transfers.

This method handles updating the balances for the addresses involved in the block's transactions. It checks for sufficient balance, validates transactions, and applies the gas fees. If the block includes a miner address, it adds the block reward and the gas collected to the miner's balance.

* **@param** {TinyChainBlock} block - The block whose balances need to be updated.

* **@param** {Balances} \[balances] - A mapping of addresses to their balances.

* **@param** {boolean} \[emitEvents=true] - If you need to send events.

* **@emits**

  * `BalanceStarted`: For each address initialized when in currency mode.
  * `BalanceUpdated`: For each address updated when in currency mode.
  * `Payload`: For each payload executed when in payload mode.
  * `MinerBalanceUpdated`: For each miner address updated when in currency mode.

* **@throws** {Error}

  * Throws an error if:

    * The reward is not a valid `BigInt`.
    * The miner address is not a valid string or null.
    * Any address in the transfers is invalid or has insufficient balance.
    * The gas limit is exceeded.
    * A transfer is made by a non-admin without being their own balance.
    * Any other invalid operation occurs during balance updates.

* **@returns** {void} - This method does not return any value.

---

### 💰 `getBalances()`

#### Retrieves a copy of all balances in the system.

This method returns an object mapping each address to its balance. Only works when `currencyMode` is enabled.

* **@returns** {Balances} - An object where each key is an address and the value is a `bigint` representing its balance.

* **@throws** {Error} - Throws if `currencyMode` is disabled.

---

### 🕰️ `getBalancesAt(startIndex?, endIndex?)`

#### Retrieves a snapshot of all balances as they were at a specific block index.

This method reprocesses the blockchain from the genesis block up to (and including) the specified index, recalculating all balances based on transfers and gas usage.

* **@param** {number} \[startIndex=0] - The starting index of the block range.

* **@param** {number|null} \[endIndex=null] - The ending index (inclusive); defaults to the last block.

* **@returns** {Balances} - An object mapping each address to its `bigint` balance at the specified block.

* **@throws** {Error} - Throws if `currencyMode` is disabled or if the index is invalid.

---

### 🔥 `getBurnedBalance()`

#### Returns the total amount of burned currency in the system.

This value represents the sum of rewards and gas fees that were not claimed by any miner (i.e., blocks without a miner address).

* **@returns** {bigint} - The total burned balance as a `bigint`.

* **@throws** {Error} - Throws if `currencyMode` is disabled.

---

### 🏦 `getBalance(address)`

#### Returns the current balance of a specific address.

If the address does not exist in the balance record, it returns 0n.

* **@param** {string} address - The address whose balance should be retrieved.

* **@returns** {bigint} - The balance of the given address, or 0n if not found.

* **@throws** {Error} - Throws if `currencyMode` is disabled.

---

### 🔄 `recalculateBalances()`

#### Recalculates all balances based on the current blockchain state.

This method resets the `balances` using `startBalances()` and, if either `currencyMode` or `payloadMode` is enabled, iterates through the entire blockchain (`this.chain`) applying `updateBalance()` to each block to recompute the balances. Finally, it emits a `BalanceRecalculated` event with the updated balances.

* **@emits** `BalanceRecalculated` - When the balance recalculation process is complete.

---

### 📏 `getChainLength()`

**Description:**
Returns the current length of the chain based on the latest block index.

**Returns:**

* `bigint`: The index of the latest block, representing the chain length.

---

### 📦 `existsLatestBlock()`

**Description:**
Checks whether the latest block in the chain exists.

**Returns:** 

* `true` if there is at least one block in the chain, otherwise `false`.

---

### 🔍 `chainBlockIndexExists(index)`

**Description:**
Checks if a block with the given internal chain index exists.

**Parameters:**

* `index`: The internal `bigint` index of the block.

**Returns:** 

* `true` if a block with that index exists, otherwise `false`.

---

### 📦 `getChainBlockByIndex(index, hash?)`

**Description:**
Retrieves a block by its internal index and optionally its hash.

**Throws:**

* If `index` is not a `bigint`, or `hash` is not a string (when provided).
* If no matching block is found.

---

### 📦 `chainBlockExists(index)`

**Description:**
Checks if a block exists at a specific array position (0-based).

**Returns:** 

* `true` if the array index exists, otherwise `false`.

---

### 🚫 `ignoreChainBlock(index, hash)`

**Description:**
Marks a block as ignored so it won't affect calculations or exports.

**Throws:**

* If `index` is not a `bigint`.
* If `hash` is not a `string`.
* If the block doesn't exist.

---

### 🔄 `unignoreChainBlock(index, hash)`

**Description:**
Unmarks a block as ignored.

**Returns:** 

* `true` if the block was ignored and is now restored.

---

### ❓ `isChainBlockIgnored(index, hash)`

**Description:**
Checks if a specific block is currently ignored.

**Returns:** 

* `true` if the block is ignored.

---

### ❓ `isChainBlockHashIgnored(hash)`

**Description:**
Checks if any block with the specified hash is ignored.

**Returns:** 

* `true` if at least one block with this hash is ignored.

---

### 🧾 `getIgnoredBlocks()`

**Description:**
Returns a shallow clone of all currently ignored blocks.

**Returns:** 

* A `Set` of strings in the format `"hash:index"`.

---

### 🔍 `getChainBlock(index)` 

**Description:**
Retrieves a block from the chain at a specific index.

**Parameters:**

* `index` (`number`): The index of the block to retrieve.

**Returns:**

* `TinyChainBlock`: The block instance at the specified index.

**Throws:**

* `Error`: If the block at the given index does not exist.

---

### 💳 `getChainBlockTx(index, tx)` 

**Description:**
Retrieves a specific transaction from a block at a given index.

**Parameters:**

* `index` (`number`): The index of the block.
* `tx` (`string`): The index of the transaction within the block.

**Returns:**

* `TransactionData`: The transaction object.

---

### 🌍 `getAllChainData()` 

**Description:**
Returns all the data from the entire blockchain.
Each block's raw data is returned as structured by its `get()` method.

**Returns:**

* `GetTransactionData[]`: An array containing all blocks' data.

---

### 🧹 `cleanChain()` 

**Description:**
Clears the entire blockchain.
This method removes all blocks from the chain, effectively resetting the blockchain to an empty state. It also resets any other associated data, like balances and burned balances.

**Emits:**

* `ChainCleared`: Emitted when the blockchain is cleared.

**Returns:**

* `void`: No return value.

---

### 💾 `exportChain(startIndex?, endIndex?)` 

**Description:**
Exports a slice of the blockchain for serialization or transfer.
The method safely extracts and serializes blocks between two indices, excluding ignored blocks.

**Parameters:**

* `startIndex` (`number`, optional): The starting index of the block range (default: 0).
* `endIndex` (`number|null`, optional): The ending index (inclusive); defaults to the last block (default: `null`).

**Returns:**

* `string[]`: An array of exported block data.

**Throws:**

* `Error`: If indices are out of bounds or invalid.

---

### 🔄 `importChain(chain)` 

**Description:**
Imports and rebuilds a blockchain from serialized block data and optionally restores the ignore list.
After import, balances are recalculated and the new chain is validated.

**Emits:**

* `ImportChain`: When the new chain is imported.

**Parameters:**

* `chain` (`string[]`): The array of serialized blocks to import.
* `ignoredBlocks` (`Set<string>`): A `Set` of ignored block identifiers (`hash:index`).

**Throws:**

* `Error`: If the imported chain is null, invalid, or corrupted.
