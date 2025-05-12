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

---

### 📏 `setMaxListeners(max)`

Set the maximum number of listeners allowed for the internal event emitter.

* **Parameters:**

  * `max` *(number)*: Maximum number of allowed listeners.

> 🧠 Useful for preventing memory leaks due to excessive listeners.

---

### 📣 `emit(event, ...args)`

Emit an event, triggering all listeners registered to it.

* **Parameters:**

  * `event` *(string | symbol)*: Name of the event to emit.
  * `...args` *(any)*: Optional arguments passed to listeners.
* **Returns:** `boolean` – `true` if the event had listeners, `false` otherwise.

> 🚀 Emits are synchronous and fire listeners in the order they were registered.

---

### 🎧 `on(event, listener)`

Register a listener for the specified event.

* **Parameters:**

  * `event` *(string | symbol)*: The event name.
  * `listener` *(ListenerCallback)*: Function to invoke when the event is emitted.
* **Returns:** `this` – Enables method chaining.

---

### ⏱️ `once(event, listener)`

Register a one-time listener for the event. It will be invoked once and then automatically removed.

* **Parameters:**

  * `event` *(string | symbol)*: The event name.
  * `listener` *(ListenerCallback)*: The callback function.
* **Returns:** `this`

---

### 🧹 `off(event, listener)`

Remove a specific listener from the given event.

* **Parameters:**

  * `event` *(string | symbol)*: The event name.
  * `listener` *(ListenerCallback)*: The listener to remove.
* **Returns:** `this`

---

### ➕ `addListener(event, listener)`

Alias for `.on()` – Register a listener for the specified event.

* **Parameters:**

  * `event` *(string | symbol)*: The event name.
  * `listener` *(ListenerCallback)*: The callback function.
* **Returns:** `this`

> 🔁 Use this if you prefer the more explicit naming convention.

---

### ➖ `removeListener(event, listener)`

Alias for `.off()` – Remove a listener from the event.

* **Parameters:**

  * `event` *(string | symbol)*: The event name.
  * `listener` *(ListenerCallback)*: The listener to remove.
* **Returns:** `this`

> 🧽 Perfect for cleaning up listeners dynamically.
