## 📡 Event Handling API

This class provides a lightweight event handling system `EventEmitter`. It supports adding, removing, and emitting events, as well as listener limits.

Here's the markdown documentation for the `TinyChainEvents` class:

---

### `TinyChainEvents` 🍮

**Description:**
This class defines all the event names used by `TinyChain` in the EventEmitter. It is a static-only class, and its members should be accessed statically. You cannot instantiate this class.

**Throws:**

* `Error`: If you try to instantiate it, it will throw an error: "Oops! TinyChainEvents isn't something you can summon like a tiny pudding. Just use it statically 🍮 :3"

---

#### **Static Properties:**

* **`InitialBalancesUpdated`**
  **Description:** Triggered when initial balances are updated.

* **`Initialized`**
  **Description:** Triggered when the blockchain instance finishes its initialization.

* **`NewBlock`**
  **Description:** Triggered when a new block is successfully added to the chain.

* **`BalancesInitialized`**
  **Description:** Triggered when all balances are initialized.

* **`BalanceStarted`**
  **Description:** Triggered when a balance record is first created for an address.

* **`BalanceUpdated`**
  **Description:** Triggered when a balance value is updated for an existing address.

* **`Payload`**
  **Description:** Triggered when a payload is emitted as part of a block or transaction.

* **`MinerBalanceUpdated`**
  **Description:** Triggered when the miner's balance is updated after a block is mined.

* **`BalanceRecalculated`**
  **Description:** Triggered when balances are recalculated during import.

* **`ChainCleared`**
  **Description:** Triggered when the entire blockchain is cleared or reset.

* **`ImportChain`**
  **Description:** Triggered when a new chain is imported and replaces the current one.

---

#### **Static Methods:**

* **`all`**
  **Returns:**

  * `string[]`: An array of all event names as strings.

  **Description:**
  Retrieves all event names defined in the class.

* **`isValid(event)`**
  **Parameters:**

  * `event` (`string`): The event name to validate.

  **Returns:**

  * `boolean`: `true` if the event is valid, `false` otherwise.

  **Description:**
  Validates if a given event is one of the defined event names in the class.
