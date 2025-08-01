import { TinyPromiseQueue } from 'tiny-essentials';
import { EventEmitter } from 'events';

import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';
import tinyOlm from './TinyOlmModule.mjs';
import TinyOlmEvents from './TinyOlmEvents.mjs';

/**
 * TinyOlm instance is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
 *
 * This class is **not available for production mode**.
 *
 * @beta
 * @class
 */
class TinyOlmInstance {
  /**
   * Creates a new TinyOlm instance for a specific userId.
   *
   * @param {string} userId - The userId to associate with the account and sessions.
   * @param {string} deviceId - The device id to associate with the account and sessions.
   * @param {string} [password] - The optional password to associate with the account and sessions.
   */
  constructor(userId, deviceId, password = '') {
    /** @type {string} */
    this.password = password;

    /** @type {string} */
    this.userId = userId;

    /** @type {string} */
    this.deviceId = deviceId;

    /** @type {Olm.Account|null} */
    this.account = null;

    /** @type {Map<string, Olm.Session>} */
    this.sessions = new Map();

    /** @type {Map<string, Olm.OutboundGroupSession>} */
    this.groupSessions = new Map();

    /** @type {Map<string, Olm.InboundGroupSession>} */
    this.groupInboundSessions = new Map();
  }

  /**
   * Important instance used to make event emitter.
   * @type {EventEmitter}
   */
  #events = new EventEmitter();

  /**
   * Important instance used to make system event emitter.
   * @type {EventEmitter}
   */
  #sysEvents = new EventEmitter();
  #sysEventsUsed = false;

  /**
   * Emits an event with optional arguments to all system emit.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   */
  #emit(event, ...args) {
    this.#events.emit(event, ...args);
    if (this.#sysEventsUsed) this.#sysEvents.emit(event, ...args);
  }

  /**
   * Provides access to a secure internal EventEmitter for subclass use only.
   *
   * This method exposes a dedicated EventEmitter instance intended specifically for subclasses
   * that extend the main class. It prevents subclasses from accidentally or intentionally using
   * the primary class's public event system (`emit`), which could lead to unpredictable behavior
   * or interference in the base class's event flow.
   *
   * For security and consistency, this method is designed to be accessed only once.
   * Multiple accesses are blocked to avoid leaks or misuse of the internal event bus.
   *
   * @returns {EventEmitter} A special internal EventEmitter instance for subclass use.
   * @throws {Error} If the method is called more than once.
   */
  getSysEvents() {
    if (this.#sysEventsUsed)
      throw new Error(
        'Access denied: getSysEvents() can only be called once. ' +
          'This restriction ensures subclass event isolation and prevents accidental interference ' +
          'with the main class event emitter.',
      );
    this.#sysEventsUsed = true;
    return this.#sysEvents;
  }

  /**
   * @typedef {(...args: any[]) => void} ListenerCallback
   * A generic callback function used for event listeners.
   */

  /**
   * Sets the maximum number of listeners for the internal event emitter.
   *
   * @param {number} max - The maximum number of listeners allowed.
   */
  setMaxListeners(max) {
    this.#events.setMaxListeners(max);
  }

  /**
   * Emits an event with optional arguments.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   * @returns {boolean} `true` if the event had listeners, `false` otherwise.
   */
  emit(event, ...args) {
    return this.#events.emit(event, ...args);
  }

  /**
   * Registers a listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  on(event, listener) {
    this.#events.on(event, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for once.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  once(event, listener) {
    this.#events.once(event, listener);
    return this;
  }

  /**
   * Removes a listener from the specified event.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  off(event, listener) {
    this.#events.off(event, listener);
    return this;
  }

  /**
   * Alias for `on`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The callback to register.
   * @returns {this} The current class instance (for chaining).
   */
  addListener(event, listener) {
    this.#events.addListener(event, listener);
    return this;
  }

  /**
   * Alias for `off`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  removeListener(event, listener) {
    this.#events.removeListener(event, listener);
    return this;
  }

  /**
   * Removes all listeners for a specific event, or all events if no event is specified.
   * @param {string | symbol} [event] - The name of the event. If omitted, all listeners from all events will be removed.
   * @returns {this} The current class instance (for chaining).
   */
  removeAllListeners(event) {
    this.#events.removeAllListeners(event);
    return this;
  }

  /**
   * Returns the number of times the given `listener` is registered for the specified `event`.
   * If no `listener` is passed, returns how many listeners are registered for the `event`.
   * @param {string | symbol} eventName - The name of the event.
   * @param {Function} [listener] - Optional listener function to count.
   * @returns {number} Number of matching listeners.
   */
  listenerCount(eventName, listener) {
    return this.#events.listenerCount(eventName, listener);
  }

  /**
   * Adds a listener function to the **beginning** of the listeners array for the specified event.
   * The listener is called every time the event is emitted.
   * @param {string | symbol} eventName - The event name.
   * @param {ListenerCallback} listener - The callback function.
   * @returns {this} The current class instance (for chaining).
   */
  prependListener(eventName, listener) {
    this.#events.prependListener(eventName, listener);
    return this;
  }

  /**
   * Adds a **one-time** listener function to the **beginning** of the listeners array.
   * The next time the event is triggered, this listener is removed and then invoked.
   * @param {string | symbol} eventName - The event name.
   * @param {ListenerCallback} listener - The callback function.
   * @returns {this} The current class instance (for chaining).
   */
  prependOnceListener(eventName, listener) {
    this.#events.prependOnceListener(eventName, listener);
    return this;
  }

  /**
   * Returns an array of event names for which listeners are currently registered.
   * @returns {(string | symbol)[]} Array of event names.
   */
  eventNames() {
    return this.#events.eventNames();
  }

  /**
   * Gets the current maximum number of listeners allowed for any single event.
   * @returns {number} The max listener count.
   */
  getMaxListeners() {
    return this.#events.getMaxListeners();
  }

  /**
   * Returns a copy of the listeners array for the specified event.
   * @param {string | symbol} eventName - The event name.
   * @returns {Function[]} An array of listener functions.
   */
  listeners(eventName) {
    return this.#events.listeners(eventName);
  }

  /**
   * Returns a copy of the internal listeners array for the specified event,
   * including wrapper functions like those used by `.once()`.
   * @param {string | symbol} eventName - The event name.
   * @returns {Function[]} An array of raw listener functions.
   */
  rawListeners(eventName) {
    return this.#events.rawListeners(eventName);
  }

  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser = new TinyCryptoParser();

  /**
   * Important instance used to make request queue.
   * @type {TinyPromiseQueue}
   */
  #queue = new TinyPromiseQueue();

  /**
   * Returns the internal TinyPromiseQueue instance (tiny-essentials module) used to manage queued operations.
   *
   * @returns {TinyPromiseQueue} The internal request queue instance.
   */
  getQueue() {
    return this.#queue;
  }

  /**
   * Add a new value type and its converter function.
   * @param {string} typeName
   * @param {(data: any) => any} getFunction
   * @param {(data: any) => { __type: string, value?: any }} convertFunction
   */
  addValueType(typeName, getFunction, convertFunction) {
    return this.#parser.addValueType(typeName, getFunction, convertFunction);
  }

  /**
   * Indicates whether the serialization or deserialization should be performed deeply.
   * @type {boolean}
   */
  isDeep = true;

  /**
   * Sets the deep serialization and deserialization mode.
   * If the argument is a boolean, updates the deep mode accordingly.
   * Throws an error if the value is not a boolean.
   *
   * @param {boolean} value - A boolean indicating whether deep mode should be enabled.
   * @throws {Error} Throws if the provided value is not a boolean.
   */
  setDeepMode(value) {
    if (typeof value !== 'boolean')
      throw new Error('The value provided to setDeepMode must be a boolean.');
    this.isDeep = value;
  }

  /**
   * Checks if the current environment is a browser with IndexedDB support.
   * @throws {Error} If not running in a browser or if IndexedDB is unavailable.
   */
  validateIsBrowser() {
    if (typeof indexedDB === 'undefined')
      throw new Error('IndexedDB is only available in browser environments.');
  }

  /** @type {string|null} */
  #dbName = null;
  /** @type {IDBDatabase|null} */
  #db = null;
  /** @type {number} */
  #dbVersion = 1;
  /** @type {boolean} */
  #useLocal = true;

  /**
   * Enables or disables the functions of use in-memory storage.
   *
   * When set to `true`, operations will use local in-memory storage,
   * useful for tests or temporary sessions that don't require persistence.
   *
   * @param {boolean} value - `true` to use in-memory storage, `false` to disable it.
   */
  setUseLocal(value) {
    this.#useLocal = value;
  }

  /**
   * Returns whether in-memory storage is currently being used.
   *
   * @returns {boolean} `true` if the system is set to use in-memory storage, otherwise `false`.
   */
  isUseLocal() {
    return this.#useLocal;
  }

  /**
   * Saves the current account to IndexedDB using a predefined key.
   * If no account is set, the method does nothing.
   *
   * @returns {Promise<void | IDBValidKey>}
   */
  async #saveAccount() {
    if (this.existsDb() && this.account)
      return this.#idbPut('account', 'main', this.account.pickle(this.password));
  }

  /**
   * Gets a value from IndexedDB by key.
   *
   * @param {string} store - The store name.
   * @param {IDBValidKey} key - The key to retrieve.
   * @returns {Promise<any>} Resolves with the stored value or undefined.
   */
  #idbGet(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction([store], 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Gets all key-value entries from a store in IndexedDB.
   *
   * @param {string} store - The store name.
   * @returns {Promise<Record<string, any>>} Resolves with all entries.
   */
  #idbGetAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction([store], 'readonly');
      const storeObj = tx.objectStore(store);
      const req = storeObj.getAllKeys();
      /** @type {Record<string, any>} */
      const result = {};
      req.onsuccess = () => {
        const keys = req.result;
        Promise.all(
          keys.map(async (/** @type {*} */ key) => {
            result[key] = await this.#idbGet(store, key);
          }),
        )
          .then(() => resolve(result))
          .catch(reject);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Stores a value in the specified IndexedDB store.
   *
   * @param {string} store - The store name.
   * @param {IDBValidKey} key - The key to store under.
   * @param {any} value - The value to store.
   * @returns {Promise<IDBValidKey>}
   */
  #idbPut(store, key, value) {
    return this.#queue.enqueue(() => {
      const tx = this.getDb().transaction([store], 'readwrite');
      const req = tx.objectStore(store).put(value, key);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          this.#events.emit(TinyOlmEvents.DbPut, store, key, value);
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  /**
   * Deletes a value from the specified IndexedDB store.
   *
   * @param {string} store - The store name.
   * @param {IDBValidKey} key - The key to delete.
   * @returns {Promise<void>}
   */
  #idbDelete(store, key) {
    return this.#queue.enqueue(() => {
      const tx = this.getDb().transaction([store], 'readwrite');
      const req = tx.objectStore(store).delete(key);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          this.#events.emit(TinyOlmEvents.DbDelete, store, key);
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  /**
   * Clears all values from the specified IndexedDB store.
   *
   * @param {string} store - The store name.
   * @returns {Promise<void>}
   */
  #idbClear(store) {
    return this.#queue.enqueue(() => {
      const tx = this.getDb().transaction([store], 'readwrite');
      const req = tx.objectStore(store).clear();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          this.#events.emit(TinyOlmEvents.DbClear, store);
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  /**
   * Returns the name of the current IndexedDB database.
   *
   * @returns {string} The database name.
   * @throws {Error} If the database name is not set.
   */
  getDbName() {
    if (typeof this.#dbName !== 'string')
      throw new Error('Invalid internal state: #dbName must be a string.');
    return this.#dbName;
  }

  /**
   * Returns the active IndexedDB database instance.
   *
   * @returns {IDBDatabase} The open database instance.
   * @throws {Error} If the database has not been initialized.
   */
  getDb() {
    if (this.#db === null)
      throw new Error('Database has not been initialized. Call the initIndexedDb() method first.');
    return this.#db;
  }

  /**
   * Checks whether the internal IndexedDB instance has been initialized.
   *
   * @returns {boolean} `true` if the database instance exists and is ready for use, otherwise `false`.
   */
  existsDb() {
    return this.#db ? true : false;
  }

  /**
   * Initializes the IndexedDB database and restores previously saved state.
   *
   * @param {string} [dbName='TinyOlmInstance'] - The name of the IndexedDB database.
   * @returns {Promise<IDBDatabase>} Resolves when the database is ready.
   * @throws {Error} If not in a browser or if the database is already initialized.
   */
  async initIndexedDb(dbName = 'TinyOlmInstance') {
    // Check all
    await tinyOlm.fetchOlm();
    this.validateIsBrowser();
    if (typeof dbName !== 'string') throw new Error('Invalid database name: expected a string.');
    if (this.existsDb()) throw new Error('Database is already open or initialized.');
    this.#dbName = dbName;

    // Get db
    const db = await new Promise((resolve, reject) => {
      const dbName = this.getDbName();
      const req = indexedDB.open(dbName, this.#dbVersion);
      req.onupgradeneeded = () => {
        // Start database
        const db = req.result;
        db.createObjectStore('account');
        db.createObjectStore('sessions');
        db.createObjectStore('groupSessions');
        db.createObjectStore('groupInboundSessions');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    this.#db = db;

    await this.#idbPut('account', 'password', this.password);
    this.#emit(TinyOlmEvents.SetPassword, this.password);

    await this.#idbPut('account', 'userId', this.userId);
    this.#emit(TinyOlmEvents.SetUserId, this.userId);

    await this.#idbPut('account', 'deviceId', this.deviceId);
    this.#emit(TinyOlmEvents.SetDeviceId, this.deviceId);

    // Load and restore account
    const accountPickle = await this.#idbGet('account', 'main');
    if (accountPickle) this.importAccount(accountPickle);

    // Load and restore sessions
    const sessionPickles = await this.#idbGetAll('sessions');
    for (const [userId, pickle] of Object.entries(sessionPickles))
      this.importSession(userId, pickle);

    const groupSessionPickles = await this.#idbGetAll('groupSessions');
    for (const [roomId, pickle] of Object.entries(groupSessionPickles))
      this.importGroupSession(roomId, pickle);

    const groupInboundPickles = await this.#idbGetAll('groupInboundSessions');
    for (const [roomId, pickle] of Object.entries(groupInboundPickles))
      this.importInboundGroupSession(roomId, pickle);

    // Db value is ready now
    return db;
  }

  async _testIndexedDb() {
    console.log('ACCOUNT');
    const accountPickles = await this.#idbGetAll('account');
    console.log(accountPickles);

    console.log('SESSIONS');
    const sessionPickles = await this.#idbGetAll('sessions');
    console.log(sessionPickles);

    console.log('GROUP SESSIONS');
    const groupSessionPickles = await this.#idbGetAll('groupSessions');
    console.log(groupSessionPickles);

    console.log('GROUP INBOUND SESSIONS');
    const groupInboundPickles = await this.#idbGetAll('groupInboundSessions');
    console.log(groupInboundPickles);
  }

  /**
   * Validates that a given userId follows the user ID format.
   *
   * A valid Matrix user ID must start with '@', contain at least one character,
   * then a ':', followed by at least one character (e.g., "@user:domain.com").
   *
   * @param {string} userId - The Matrix user ID to validate.
   * @throws {Error} Throws an error if the userId does not match the expected format.
   * @returns {void}
   */
  checkUserId(userId) {
    if (!/^@.+:.+$/.test(userId)) throw new Error('Invalid Matrix user ID format.');
  }

  /**
   * Sets the new password of instance.
   *
   * @param {string} newPassword - The new password.
   * @throws {Error} Throws if the provided value is not a string.
   */
  async setPassword(newPassword) {
    if (typeof newPassword !== 'string')
      throw new Error('The value provided to password must be a string.');
    this.password = newPassword;

    if (this.existsDb()) await this.#idbPut('account', 'password', this.password);
    this.#emit(TinyOlmEvents.SetPassword, newPassword);
  }

  /**
   * Returns the current password used for (un)pickling.
   *
   * @returns {string} The current password.
   * @throws {Error} Throws if the password is not set.
   */
  getPassword() {
    if (typeof this.password !== 'string') throw new Error('No password is set.');
    return this.password;
  }

  /**
   * Sets the userId of this instance.
   *
   * @param {string} newUserId - The new userId.
   * @throws {Error} Throws if the provided value is not a string.
   */
  async setUserId(newUserId) {
    if (typeof newUserId !== 'string')
      throw new Error('The value provided to userId must be a string.');
    this.userId = newUserId;
    if (this.existsDb()) await this.#idbPut('account', 'userId', this.userId);
    this.#emit(TinyOlmEvents.SetUserId, newUserId);
  }

  /**
   * Returns the current userId.
   *
   * @returns {string} The current userId.
   * @throws {Error} Throws if the userId is not set.
   */
  getUserId() {
    if (typeof this.userId !== 'string') throw new Error('No userId is set.');
    return this.userId;
  }

  /**
   * Sets the device ID of this instance.
   *
   * @param {string} newDeviceId - The new device ID.
   * @throws {Error} Throws if the provided value is not a string.
   */
  async setDeviceId(newDeviceId) {
    if (typeof newDeviceId !== 'string')
      throw new Error('The value provided to deviceId must be a string.');
    this.deviceId = newDeviceId;
    if (this.existsDb()) await this.#idbPut('account', 'deviceId', this.deviceId);
    this.#emit(TinyOlmEvents.SetDeviceId, newDeviceId);
  }

  /**
   * Returns the current device ID.
   *
   * @returns {string} The current device ID.
   * @throws {Error} Throws if the device ID is not set.
   */
  getDeviceId() {
    if (typeof this.deviceId !== 'string') throw new Error('No deviceId is set.');
    return this.deviceId;
  }

  /**
   * @typedef {Object} ExportedOlmInstance
   * @property {string|null} account - Pickled Olm.Account object.
   * @property {Record<string, string>|null} sessions - Pickled Olm.Session objects, indexed by session ID.
   * @property {Record<string, string>|null} groupSessions - Pickled Olm.OutboundGroupSession objects, indexed by room/session ID.
   * @property {Record<string, string>|null} groupInboundSessions - Pickled Olm.InboundGroupSession objects, indexed by sender key or session ID.
   */

  /**
   * Export the current Olm account as a pickled string.
   *
   * @param {string} [password=this.password] - The password used to encrypt the pickle.
   * @returns {string} The pickled Olm account.
   * @throws {Error} If the account is not initialized.
   */
  exportAccount(password = this.getPassword()) {
    if (!this.account) throw new Error('Account is not initialized.');
    return this.account.pickle(password);
  }

  /**
   * Export a specific Olm session with a given user.
   *
   * @param {string} userId - The userId of the remote device.
   * @param {string} [password=this.password] - The password used to encrypt the pickle.
   * @returns {string} The pickled Olm session.
   * @throws {Error} If the session is not found.
   */
  exportSession(userId, password = this.password) {
    const sess = this.getSession(userId);
    return sess.pickle(password);
  }

  /**
   * Export an outbound group session for a specific room.
   *
   * @param {string} roomId - The ID of the room.
   * @param {string} [password=this.password] - The password used to encrypt the pickle.
   * @returns {string} The pickled outbound group session.
   * @throws {Error} If the group session is not found.
   */
  exportGroupSession(roomId, password = this.getPassword()) {
    const sess = this.getGroupSession(roomId);
    return sess.pickle(password);
  }

  /**
   * Export an inbound group session for a specific room and sender.
   *
   * @param {string} roomId - The ID of the room.
   * @param {string} userId - The sender's userId or session owner.
   * @param {string} [password=this.password] - The password used to encrypt the pickle.
   * @returns {string} The pickled inbound group session.
   * @throws {Error} If the inbound group session is not found.
   */
  exportInboundGroupSession(roomId, userId, password = this.getPassword()) {
    const sess = this.getInboundGroupSession(roomId, userId);
    return sess.pickle(password);
  }

  /**
   * @param {string} [password] The password used to pickle. If you do not enter any, the predefined password will be used.
   * @returns {ExportedOlmInstance} Serial structure
   */
  exportInstance(password = this.getPassword()) {
    return {
      account: this.exportAccount(),
      sessions: Object.fromEntries(
        Array.from(this.sessions.entries()).map(([key, sess]) => [key, sess.pickle(password)]),
      ),
      groupSessions: Object.fromEntries(
        Array.from(this.groupSessions.entries()).map(([key, group]) => [
          key,
          group.pickle(password),
        ]),
      ),
      groupInboundSessions: Object.fromEntries(
        Array.from(this.groupInboundSessions.entries()).map(([key, inbound]) => [
          key,
          inbound.pickle(password),
        ]),
      ),
    };
  }

  /**
   * Export a specific Olm session with a given user from indexedDb.
   *
   * @param {string} userId - The userId of the remote device.
   * @returns {Promise<string>} The pickled Olm session.
   * @throws {Error} If the session is not found.
   */
  async exportDbSession(userId) {
    return this.#idbGet('sessions', userId);
  }

  /**
   * Export an outbound group session for a specific room from indexedDb.
   *
   * @param {string} roomId - The ID of the room.
   * @returns {Promise<string>} The pickled outbound group session.
   * @throws {Error} If the group session is not found.
   */
  async exportDbGroupSession(roomId) {
    return this.#idbGet('groupSessions', roomId);
  }

  /**
   * Export an inbound group session for a specific room and sender from indexedDb.
   *
   * @param {string} roomId - The ID of the room.
   * @param {string} userId - The sender's userId or session owner.
   * @returns {Promise<string>} The pickled inbound group session.
   * @throws {Error} If the inbound group session is not found.
   */
  async exportDbInboundGroupSession(roomId, userId) {
    return this.#idbGet('groupInboundSessions', this.#getGroupSessionId(roomId, userId));
  }

  /**
   * @returns {Promise<ExportedOlmInstance>} Serial structure
   */
  async exportDbInstance() {
    return {
      account: this.exportAccount(),
      sessions: await this.#idbGetAll('sessions'),
      groupSessions: await this.#idbGetAll('groupSessions'),
      groupInboundSessions: await this.#idbGetAll('groupInboundSessions'),
    };
  }

  /**
   * Import and restore an Olm account from a pickled string.
   *
   * @param {string} pickled - The pickled Olm account string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {Promise<void>}
   */
  async importAccount(pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const account = new Olm.Account();
    account.unpickle(password, pickled);
    this.account = account;

    if (this.existsDb()) await this.#idbPut('account', 'main', account.pickle(this.password));
    this.#emit(TinyOlmEvents.ImportAccount, account);
  }

  /**
   * Import and restore an Olm session from a pickled string.
   *
   * @param {string} key - The session key used to index this session (usually userId or `userId|deviceId`).
   * @param {string} pickled - The pickled Olm session string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {Promise<void>}
   */
  async importSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const sess = new Olm.Session();
    sess.unpickle(password, pickled);
    if (this.isUseLocal()) this.sessions.set(key, sess);

    await this.#idbPut('sessions', key, sess.pickle(this.password));
    this.#emit(TinyOlmEvents.ImportSession, key, sess);
  }

  /**
   * Import and restore an outbound group session from a pickled string.
   *
   * @param {string} key - The key used to index the group session (usually the roomId).
   * @param {string} pickled - The pickled Olm.OutboundGroupSession string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {Promise<void>}
   */
  async importGroupSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const group = new Olm.OutboundGroupSession();
    group.unpickle(password, pickled);
    if (this.isUseLocal()) this.groupSessions.set(key, group);

    if (this.existsDb()) await this.#idbPut('groupSessions', key, group.pickle(this.password));
    this.#emit(TinyOlmEvents.ImportGroupSession, key, group);
  }

  /**
   * Import and restore an inbound group session from a pickled string.
   *
   * @param {string} key - The key used to index the inbound group session (usually sender key or `roomId|sender`).
   * @param {string} pickled - The pickled Olm.InboundGroupSession string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {Promise<void>}
   */
  async importInboundGroupSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const inbound = new Olm.InboundGroupSession();
    inbound.unpickle(password, pickled);
    if (this.isUseLocal()) this.groupInboundSessions.set(key, inbound);

    if (this.existsDb())
      await this.#idbPut('groupInboundSessions', key, inbound.pickle(this.password));
    this.#emit(TinyOlmEvents.ImportInboundGroupSession, key, inbound);
  }

  /**
   * @param {ExportedOlmInstance} data Returned object of exportInstance
   * @param {string} [password] The password used to pickle
   * @returns {Promise<void[]>}
   */
  async importInstance(data, password = '') {
    await tinyOlm.fetchOlm();
    const promises = [];

    if (data.account) promises.push(this.importAccount(data.account, password));

    if (data.sessions)
      for (const [key, pickled] of Object.entries(data.sessions))
        promises.push(this.importSession(key, pickled, password));

    if (data.groupSessions)
      for (const [key, pickled] of Object.entries(data.groupSessions))
        promises.push(this.importGroupSession(key, pickled, password));

    if (data.groupInboundSessions)
      for (const [key, pickled] of Object.entries(data.groupInboundSessions))
        promises.push(this.importInboundGroupSession(key, pickled, password));

    return Promise.all(promises);
  }

  /**
   * Retrieves all active sessions.
   *
   * @returns {Map<string, Olm.Session>} A map of all active sessions where the key is the userId.
   */
  getAllSessions() {
    return this.sessions;
  }

  /**
   * Retrieves the session for a specific userId.
   *
   * @param {string} userId - The userId whose session is to be retrieved.
   * @returns {Olm.Session} The session for the specified userId, or null if no session exists.
   * @throws {Error} Throws an error if no session exists for the specified userId.
   */
  getSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) throw new Error(`No session found with ${userId}`);
    return session;
  }

  /**
   * Removes the session for a specific userId.
   *
   * @param {string} userId - The userId whose session is to be removed.
   * @returns {Promise<boolean>} Returns true if the session was removed, otherwise false.
   * @throws {Error} Throws an error if no session exists for the specified userId.
   */
  async removeSession(userId) {
    const session = this.getSession(userId);
    session.free();

    if (this.existsDb()) await this.#idbDelete('sessions', userId);
    this.#emit(TinyOlmEvents.RemoveSession, userId, session);
    return this.isUseLocal() ? this.sessions.delete(userId) : true;
  }

  /**
   * Clears all active sessions.
   *
   * @returns {Promise<void>}
   */
  async clearSessions() {
    for (const session of this.sessions.values()) session.free();
    this.sessions.clear();
    if (this.existsDb()) await this.#idbClear('sessions');
    this.#emit(TinyOlmEvents.ClearSessions);
  }

  /**
   * Initializes the Olm library and creates a new account.
   *
   * @returns {Promise<void>}
   */
  async init() {
    const Olm = await tinyOlm.fetchOlm();
    this.account = new Olm.Account();
    this.account.create();

    if (this.existsDb()) await this.#idbPut('account', 'main', this.account.pickle(this.password));
    this.#emit(TinyOlmEvents.CreateAccount, this.account);
  }

  /**
   * Gets the unique session ID for a group session per user.
   * @param {string} roomId
   * @param {string} [userId]
   * @returns {string}
   */
  #getGroupSessionId(roomId, userId) {
    return `${userId}${typeof roomId === 'string' ? `:${roomId}` : ''}`;
  }

  /**
   * Creates a new outbound group session for a specific room.
   * @param {string} roomId
   * @returns {Promise<Olm.OutboundGroupSession>}
   */
  async createGroupSession(roomId) {
    const Olm = tinyOlm.getOlm();
    const outboundSession = new Olm.OutboundGroupSession();
    outboundSession.create();
    if (this.isUseLocal()) this.groupSessions.set(roomId, outboundSession);

    if (this.existsDb())
      await this.#idbPut('groupSessions', roomId, outboundSession.pickle(this.password));
    this.#emit(TinyOlmEvents.CreateGroupSession, roomId, outboundSession);
    return outboundSession;
  }

  /**
   * Exports the current outbound group session key for a room.
   * @param {string} roomId
   * @returns {string}
   * @throws {Error} If no outbound session exists for the given room.
   */
  exportGroupSessionId(roomId) {
    const outboundSession = this.groupSessions.get(roomId);
    if (!outboundSession) throw new Error(`No outbound group session found for room: ${roomId}`);
    return outboundSession.session_key();
  }

  /**
   * Exports the current outbound group session key for a room from the indexdedDb
   * @param {string} roomId
   * @returns {Promise<string>}
   * @throws {Error} If no outbound session exists for the given room.
   */
  async exportDbGroupSessionId(roomId) {
    const Olm = tinyOlm.getOlm();
    const pickled = await this.#idbGet('groupSessions', roomId);
    if (!pickled) throw new Error(`No outbound group session found for room: ${roomId}`);
    const outboundSession = new Olm.OutboundGroupSession();
    outboundSession.unpickle(this.password, pickled);
    return outboundSession.session_key();
  }

  /**
   * Imports an inbound group session using a provided session key.
   * @param {string} roomId
   * @param {string} userId
   * @param {string} sessionKey
   * @returns {Promise<void>}
   */
  async importGroupSessionId(roomId, userId, sessionKey) {
    const Olm = tinyOlm.getOlm();
    const inboundSession = new Olm.InboundGroupSession();
    inboundSession.create(sessionKey);
    const sessionId = this.#getGroupSessionId(roomId, userId);
    if (this.isUseLocal()) this.groupInboundSessions.set(sessionId, inboundSession);

    if (this.existsDb())
      await this.#idbPut('groupInboundSessions', sessionId, inboundSession.pickle(this.password));
    this.#emit(TinyOlmEvents.ImportGroupSessionId, sessionId, inboundSession);
  }

  /**
   * Returns all outbound group sessions.
   * @returns {Map<string, Olm.OutboundGroupSession>}
   */
  getAllGroupSessions() {
    return this.groupSessions;
  }

  /**
   * Returns a specific outbound group session by room ID.
   * @param {string} roomId
   * @returns {Olm.OutboundGroupSession}
   * @throws {Error} If no outbound session exists for the given room.
   */
  getGroupSession(roomId) {
    const session = this.groupSessions.get(roomId);
    if (!session) throw new Error(`No outbound group session found for room: ${roomId}`);
    return session;
  }

  /**
   * Removes a specific outbound group session by room ID.
   * @param {string} roomId
   * @returns {Promise<boolean>} True if a session was removed, false otherwise.
   */
  async removeGroupSession(roomId) {
    const session = this.getGroupSession(roomId);
    session.free();

    if (this.existsDb()) await this.#idbDelete('groupSessions', roomId);
    this.#emit(TinyOlmEvents.RemoveGroupSession, roomId, session);
    return this.isUseLocal() ? this.groupSessions.delete(roomId) : true;
  }

  /**
   * Clears all group sessions.
   *
   * @returns {Promise<void>}
   */
  async clearGroupSessions() {
    for (const groupSession of this.groupSessions.values()) groupSession.free();
    this.groupSessions.clear();

    if (this.existsDb()) await this.#idbClear('groupSessions');
    this.#emit(TinyOlmEvents.ClearGroupSessions);
  }

  /**
   * Returns all inbound group sessions.
   * @returns {Map<string, Olm.InboundGroupSession>}
   */
  getAllInboundGroupSessions() {
    return this.groupInboundSessions;
  }

  /**
   * Returns a specific inbound group session by room ID and userId.
   * @param {string} roomId
   * @param {string} [userId]
   * @returns {Olm.InboundGroupSession}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  getInboundGroupSession(roomId, userId) {
    const sessionId = this.#getGroupSessionId(roomId, userId);
    const session = this.groupInboundSessions.get(sessionId);
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId}, userId: ${userId}`);
    return session;
  }

  /**
   * Removes a specific inbound group session by room ID and userId.
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<boolean>} True if a session was removed, false otherwise.
   */
  async removeInboundGroupSession(roomId, userId) {
    const sessionId = this.#getGroupSessionId(roomId, userId);
    const session = this.getInboundGroupSession(sessionId);
    session.free();

    if (this.existsDb()) await this.#idbDelete('groupInboundSessions', sessionId);
    this.#emit(TinyOlmEvents.RemoveInboundGroupSession, sessionId, session);
    return this.isUseLocal() ? this.groupInboundSessions.delete(sessionId) : true;
  }

  /**
   * Clears all inbound group sessions.
   *
   * @returns {Promise<void>}
   */
  async clearInboundGroupSessions() {
    for (const inbound of this.groupInboundSessions.values()) inbound.free();
    this.groupInboundSessions.clear();
    if (this.existsDb()) await this.#idbClear('groupInboundSessions');
    this.#emit(TinyOlmEvents.ClearInboundGroupSessions);
  }

  /**
   * Retrieves the identity keys (curve25519 and ed25519) for the account.
   *
   * @returns {{curve25519: Record<string, string>, ed25519: string}}
   * @throws {Error} Throws an error if account is not initialized.
   */
  getIdentityKeys() {
    if (!this.account) throw new Error('Account is not initialized.');
    return JSON.parse(this.account.identity_keys());
  }

  /**
   * Generates a specified number of one-time keys for the account and signs them.
   *
   * @param {number} [number=10] - The number of one-time keys to generate.
   * @returns {Promise<Record<string, {
   *   key: string,
   *   signatures: Record<string, Record<string, string>>
   * }>>}
   * @throws {Error} Throws an error if account is not initialized.
   */
  async generateOneTimeKeys(number = 10) {
    if (!this.account) throw new Error('Account is not initialized.');
    this.account.generate_one_time_keys(number);

    if (!this.account) throw new Error('Account is not initialized.');
    const oneTimeKeys = this.getOneTimeKeys();
    /** @type {Record<string, { key: string, signatures: Record<string, Record<string, string>> }>} */
    const signedKeys = {};

    const identityKeys = this.getIdentityKeys();
    for (const [keyId, key] of Object.entries(oneTimeKeys.curve25519)) {
      const payload = JSON.stringify({ key });
      const signature = this.account.sign(payload);
      signedKeys[keyId] = {
        key,
        signatures: {
          [this.getUserId()]: {
            [`ed25519:${identityKeys.ed25519}`]: signature,
          },
        },
      };
    }
    /** @type {Record<string, { key: string, signatures: Record<string, Record<string, string>> }>} */
    this.signedOneTimeKeys = signedKeys;

    await this.#saveAccount();
    this.#emit(TinyOlmEvents.SignOneTimeKeys, signedKeys);
    return signedKeys;
  }

  /**
   * Retrieves the one-time keys currently available for the account.
   *
   * @returns {{curve25519: Record<string, string>}}
   * @throws {Error} Throws an error if account is not initialized.
   */
  getOneTimeKeys() {
    if (!this.account) throw new Error('Account is not initialized.');
    return JSON.parse(this.account.one_time_keys());
  }

  /**
   * Marks the current set of keys as published, preventing them from being reused.
   *
   * @returns {Promise<void>}
   * @throws {Error} Throws an error if account is not initialized.
   */
  async markKeysAsPublished() {
    if (!this.account) throw new Error('Account is not initialized.');
    this.account.mark_keys_as_published();

    await this.#saveAccount();
    this.#emit(TinyOlmEvents.MarkKeysAsPublished);
  }

  /**
   * Creates an outbound session with another user using their identity and one-time keys.
   *
   * @param {string} theirIdentityKey - The identity key of the target user.
   * @param {string} theirOneTimeKey - The one-time key of the target user.
   * @param {string} theirUsername - The userId of the target user.
   * @returns {Promise<void>}
   * @throws {Error} Throws an error if account is not initialized.
   */
  async createOutboundSession(theirIdentityKey, theirOneTimeKey, theirUsername) {
    if (!this.account) throw new Error('Account is not initialized.');
    if (!theirOneTimeKey) throw new Error('No one-time key available for the user.');
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_outbound(this.account, theirIdentityKey, theirOneTimeKey);
    if (this.isUseLocal()) this.sessions.set(theirUsername, session);

    if (this.existsDb())
      await this.#idbPut('sessions', theirUsername, session.pickle(this.password));
    this.#emit(TinyOlmEvents.CreateOutboundSession, theirUsername, session);
  }

  /**
   * Creates an inbound session from a received encrypted message.
   *
   * @param {string} senderIdentityKey - The sender's identity key.
   * @param {string} ciphertext - The ciphertext received.
   * @param {string} senderUsername - The userId of the sender.
   * @returns {Promise<void>}
   * @throws {Error} Throws an error if account is not initialized.
   */
  async createInboundSession(senderIdentityKey, ciphertext, senderUsername) {
    if (!this.account) throw new Error('Account is not initialized.');
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_inbound_from(this.account, senderIdentityKey, ciphertext);
    this.account.remove_one_time_keys(session);
    if (this.isUseLocal()) this.sessions.set(senderUsername, session);

    if (this.existsDb())
      await this.#idbPut('sessions', senderUsername, session.pickle(this.password));
    this.#emit(TinyOlmEvents.CreateInboundSession, senderUsername, session);
  }

  /**
   * Checks if there is an active session with a specific userId.
   *
   * @param {string} userId - The userId to check.
   * @returns {boolean} True if a session exists, false otherwise.
   */
  hasSession(userId) {
    return this.sessions.has(userId);
  }

  /**
   * Exports the device identity keys and available one-time keys format.
   *
   * @returns {object}
   * @throws {Error} Throws an error if account is not initialized.
   */
  exportIdentityAndOneTimeKeys() {
    if (!this.account) throw new Error('Account is not initialized.');
    const identityKeys = this.getIdentityKeys();
    const oneTimeKeys = this.getOneTimeKeys();
    const deviceId = this.getDeviceId();
    const userId = this.getUserId();

    return {
      device_id: deviceId,
      user_id: userId,
      algorithms: ['m.olm.v1.curve25519-aes-sha2'],
      keys: {
        [`curve25519:${deviceId}`]: identityKeys.curve25519,
        [`ed25519:${deviceId}`]: identityKeys.ed25519,
      },
      signatures: {
        [userId]: {
          [`ed25519:${deviceId}`]: this.account.sign(
            JSON.stringify({
              algorithms: ['m.olm.v1.curve25519-aes-sha2'],
              device_id: deviceId,
              user_id: userId,
              keys: {
                [`curve25519:${deviceId}`]: identityKeys.curve25519,
                [`ed25519:${deviceId}`]: identityKeys.ed25519,
              },
            }),
          ),
        },
      },
      one_time_keys: Object.entries(oneTimeKeys.curve25519).reduce(
        /**
         * @param {*} obj
         * @param {[any, any]} param0
         * @returns {*}
         */
        (obj, [keyId, key]) => {
          obj[`curve25519:${keyId}`] = key;
          return obj;
        },
        {},
      ),
    };
  }

  /**
   * Disposes the instance by clearing all sessions and the account.
   *
   * @returns {Promise<void>}
   */
  async dispose() {
    await Promise.all([
      this.clearGroupSessions(),
      this.clearInboundGroupSessions(),
      this.clearSessions(),
    ]);
    if (this.account) {
      this.account.free();
      this.account = null;
      if (this.existsDb()) await this.#idbDelete('account', 'main');
      this.#emit(TinyOlmEvents.ResetAccount);
    }
  }

  /**
   * Regenerates the identity keys by creating a new account.
   *
   * This process will:
   * - Free the current Olm.Account and create a new one.
   * - Generate new curve25519 and ed25519 identity keys.
   *
   * Important: After regenerating the identity keys, you must:
   * - Generate new one-time keys by calling `generateOneTimeKeys()`.
   * - Mark the keys as published by calling `markKeysAsPublished()`.
   * - Update your device information on the server to broadcast the new keys.
   *
   * @returns {Promise<void>}
   */
  async regenerateIdentityKeys() {
    const Olm = await tinyOlm.fetchOlm();
    if (this.account) this.account.free();
    if (this.existsDb()) await this.#idbDelete('account', 'main');
    this.#emit(TinyOlmEvents.ResetAccount);

    this.account = new Olm.Account();
    this.account.create();

    if (this.existsDb()) await this.#idbPut('account', 'main', this.account.pickle(this.password));
    this.#emit(TinyOlmEvents.CreateAccount, this.account);
  }

  /**
   * @typedef {Object} EncryptedMessage
   * @property {0 | 1} type - The type of the message (0 for pre-key, 1 for message).
   * @property {string} body - The encrypted message body.
   */

  /**
   * Creates an encrypted event structure for sending a message to a device.
   *
   * @param {EncryptedMessage} encrypted - The encrypted message details.
   * @param {string} toDeviceCurve25519Key - The recipient's Curve25519 key for encryption.
   * @returns {object} The encrypted message event ready to be sent.
   */
  getEncryptEvent(encrypted, toDeviceCurve25519Key) {
    return {
      algorithm: 'm.olm.v1.curve25519-aes-sha2',
      sender_key: this.getIdentityKeys().curve25519,
      ciphertext: {
        [toDeviceCurve25519Key]: {
          type: encrypted.type,
          body: encrypted.body,
        },
      },
    };
  }

  /**
   * @typedef {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }} EncryptedData
   */

  /**
   * @typedef {{
   *   message_index: number,
   *   content: string
   * }} DecryptedGroupContent
   */

  /**
   * @typedef {{
   *   message_index: number,
   *   plaintext: string
   * }} DecryptedGroupMessage
   */

  /**
   * @param {Olm.Session|undefined} session
   * @param {string} toUsername
   * @param {string} plaintext
   * @returns {EncryptedMessage}
   * @throws {Error}
   */
  #encryptMessage(session, toUsername, plaintext) {
    if (!session) throw new Error(`No session found with ${toUsername}`);
    return session.encrypt(plaintext);
  }

  /**
   * @param {Olm.Session|undefined} session
   * @param {string} fromUsername
   * @param {number} messageType
   * @param {string} ciphertext
   * @returns {string}
   * @throws {Error}
   */
  #decryptMessage(session, fromUsername, messageType, ciphertext) {
    if (!session) throw new Error(`No session found with ${fromUsername}`);
    const plaintext = session.decrypt(messageType, ciphertext);
    // After decrypting, consider the session updated (ratcheted)
    session.has_received_message();
    return plaintext;
  }

  /**
   * @param {*} data
   * @returns {string}
   * @throws {Error}
   */
  #encrypt(data) {
    return this.isDeep ? this.#parser.serializeDeep(data) : this.#parser.serialize(data);
  }

  /**
   * @param {string} decrypted
   * @param {string|null} [expectedType=null]
   * @returns {*}
   * @throws {Error}
   */
  #decrypt(decrypted, expectedType = null) {
    const { value } = this.isDeep
      ? this.#parser.deserializeDeep(decrypted, expectedType)
      : this.#parser.deserialize(decrypted, expectedType);
    return value;
  }

  /**
   * @param {Olm.OutboundGroupSession|undefined} session
   * @param {string} roomId
   * @param {string} plaintext
   * @returns {EncryptedData}
   * @throws {Error}
   */
  #encryptGroupMessage(session, roomId, plaintext) {
    if (!session) throw new Error(`No outbound group session found for room: ${roomId}`);

    const ciphertext = session.encrypt(plaintext);
    return {
      body: ciphertext,
      session_id: session.session_id(),
      message_index: session.message_index(),
    };
  }

  /**
   * @param {Olm.InboundGroupSession|undefined} session
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @returns {DecryptedGroupMessage}
   * @throws {Error}
   */
  #decryptGroupMessage(session, roomId, userId, encryptedMessage) {
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${userId}`);
    return session.decrypt(encryptedMessage.body);
  }

  /**
   * @param {Olm.OutboundGroupSession|undefined} session
   * @param {string} roomId
   * @param {*} data
   * @returns {EncryptedData}
   * @throws {Error}
   */
  #encryptGroupContent(session, roomId, data) {
    if (!session) throw new Error(`No outbound group session found for room: ${roomId}`);

    const plainText = this.#encrypt(data);
    const ciphertext = session.encrypt(plainText);
    return {
      body: ciphertext,
      session_id: session.session_id(),
      message_index: session.message_index(),
    };
  }

  /**
   * @param {Olm.InboundGroupSession|undefined} session
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @param {string|null} [expectedType=null]
   * @returns {DecryptedGroupContent}
   * @throws {Error}
   */
  #decryptGroupContent(session, roomId, userId, encryptedMessage, expectedType) {
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${userId}`);
    const result = session.decrypt(encryptedMessage.body);
    return {
      message_index: result.message_index,
      content: this.#decrypt(result.plaintext, expectedType),
    };
  }

  /**
   * Encrypts a plaintext message to a specified user.
   *
   * @param {string} toUsername - The userId of the recipient.
   * @param {string} plaintext - The plaintext message to encrypt.
   * @returns {EncryptedMessage} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  encryptMessage(toUsername, plaintext) {
    return this.#encryptMessage(this.sessions.get(toUsername), toUsername, plaintext);
  }

  /**
   * Decrypts a received ciphertext message from a specified user.
   *
   * @param {string} fromUsername - The userId of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} ciphertext - The ciphertext to decrypt.
   * @returns {string} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  decryptMessage(fromUsername, messageType, ciphertext) {
    return this.#decryptMessage(
      this.sessions.get(fromUsername),
      fromUsername,
      messageType,
      ciphertext,
    );
  }

  /**
   * Encrypts a data to a specified user.
   *
   * @param {string} toUsername - The userId of the recipient.
   * @param {*} data - The content to encrypt.
   * @returns {EncryptedMessage} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  encrypt(toUsername, data) {
    return this.encryptMessage(toUsername, this.#encrypt(data));
  }

  /**
   * Decrypts a received data from a specified user.
   *
   * @param {string} fromUsername - The userId of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} plaintext - The decrypted content to decrypt.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {*} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  decrypt(fromUsername, messageType, plaintext, expectedType = null) {
    return this.#decrypt(this.decryptMessage(fromUsername, messageType, plaintext), expectedType);
  }

  /**
   * Encrypts a plaintext message for a specific room using the outbound group session.
   * @param {string} roomId
   * @param {string} plaintext
   * @returns {EncryptedData}
   * @throws {Error} If no outbound session exists for the given room.
   */
  encryptGroupMessage(roomId, plaintext) {
    return this.#encryptGroupMessage(this.groupSessions.get(roomId), roomId, plaintext);
  }

  /**
   * Decrypts an encrypted group message using the inbound group session.
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @returns {DecryptedGroupMessage}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  decryptGroupMessage(roomId, userId, encryptedMessage) {
    return this.#decryptGroupMessage(
      this.groupInboundSessions.get(this.#getGroupSessionId(roomId, userId)),
      roomId,
      userId,
      encryptedMessage,
    );
  }

  /**
   * Encrypts a content for a specific room using the outbound group session.
   * @param {string} roomId
   * @param {*} data
   * @returns {EncryptedData}
   * @throws {Error} If no outbound session exists for the given room.
   */
  encryptGroupContent(roomId, data) {
    return this.#encryptGroupContent(this.groupSessions.get(roomId), roomId, data);
  }

  /**
   * Decrypts an encrypted content using the inbound group session.
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {DecryptedGroupContent}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  decryptGroupContent(roomId, userId, encryptedMessage, expectedType) {
    return this.#decryptGroupContent(
      this.groupInboundSessions.get(this.#getGroupSessionId(roomId, userId)),
      roomId,
      userId,
      encryptedMessage,
      expectedType,
    );
  }

  /**
   * Encrypts a plaintext message to a specified user from indexedDb.
   *
   * @param {string} toUsername - The userId of the recipient.
   * @param {string} plaintext - The plaintext message to encrypt.
   * @returns {Promise<EncryptedMessage>} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  async encryptMessageV2(toUsername, plaintext) {
    const pickled = await this.#idbGet('sessions', toUsername);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let sess;
      try {
        sess = new Olm.Session();
        sess.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#encryptMessage(sess, toUsername, plaintext));
        sess?.free();
      }
    });
  }

  /**
   * Decrypts a received ciphertext message from a specified user from indexedDb.
   *
   * @param {string} fromUsername - The userId of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} ciphertext - The ciphertext to decrypt.
   * @returns {Promise<string>} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  async decryptMessageV2(fromUsername, messageType, ciphertext) {
    const pickled = await this.#idbGet('sessions', fromUsername);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let sess;
      try {
        sess = new Olm.Session();
        sess.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#decryptMessage(sess, fromUsername, messageType, ciphertext));
        sess?.free();
      }
    });
  }

  /**
   * Encrypts a data to a specified user from indexedDb.
   *
   * @param {string} toUsername - The userId of the recipient.
   * @param {*} data - The content to encrypt.
   * @returns {Promise<EncryptedMessage>} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  async encryptV2(toUsername, data) {
    const pickled = await this.#idbGet('sessions', toUsername);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let sess;
      try {
        sess = new Olm.Session();
        sess.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#encryptMessage(sess, toUsername, this.#encrypt(data)));
        sess?.free();
      }
    });
  }

  /**
   * Decrypts a received data from a specified user from indexedDb.
   *
   * @param {string} fromUsername - The userId of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} plaintext - The decrypted content to decrypt.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {Promise<*>} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  async decryptV2(fromUsername, messageType, plaintext, expectedType = null) {
    const pickled = await this.#idbGet('sessions', fromUsername);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let sess;
      try {
        sess = new Olm.Session();
        sess.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(
          this.#decrypt(
            this.#decryptMessage(sess, fromUsername, messageType, plaintext),
            expectedType,
          ),
        );
        sess?.free();
      }
    });
  }

  /**
   * Encrypts a plaintext message for a specific room using the outbound group session from indexedDb.
   * @param {string} roomId
   * @param {string} plaintext
   * @returns {Promise<EncryptedData>}
   * @throws {Error} If no outbound session exists for the given room.
   */
  async encryptGroupMessageV2(roomId, plaintext) {
    const pickled = await this.#idbGet('groupSessions', roomId);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let session;
      try {
        session = new Olm.OutboundGroupSession();
        session.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#encryptGroupMessage(session, roomId, plaintext));
        session?.free();
      }
    });
  }

  /**
   * Decrypts an encrypted group message using the inbound group session from indexedDb.
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @returns {Promise<DecryptedGroupMessage>}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  async decryptGroupMessageV2(roomId, userId, encryptedMessage) {
    const sessionId = this.#getGroupSessionId(roomId, userId);
    const pickled = await this.#idbGet('groupInboundSessions', sessionId);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let inbound;
      try {
        inbound = new Olm.InboundGroupSession();
        inbound.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#decryptGroupMessage(inbound, roomId, userId, encryptedMessage));
        inbound?.free();
      }
    });
  }

  /**
   * Encrypts a content for a specific room using the outbound group session from indexedDb.
   * @param {string} roomId
   * @param {*} data
   * @returns {Promise<EncryptedData>}
   * @throws {Error} If no outbound session exists for the given room.
   */
  async encryptGroupContentV2(roomId, data) {
    const pickled = await this.#idbGet('groupSessions', roomId);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let session;
      try {
        session = new Olm.OutboundGroupSession();
        session.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#encryptGroupContent(session, roomId, data));
        session?.free();
      }
    });
  }

  /**
   * Decrypts an encrypted content using the inbound group session from indexedDb.
   * @param {string} roomId
   * @param {string} userId
   * @param {EncryptedData} encryptedMessage
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {Promise<DecryptedGroupContent>}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  async decryptGroupContentV2(roomId, userId, encryptedMessage, expectedType) {
    const sessionId = this.#getGroupSessionId(roomId, userId);
    const pickled = await this.#idbGet('groupInboundSessions', sessionId);
    return new Promise((resolve, reject) => {
      const Olm = tinyOlm.getOlm();
      let inbound;
      try {
        inbound = new Olm.InboundGroupSession();
        inbound.unpickle(this.password, pickled);
      } catch (err) {
        reject(err);
      } finally {
        resolve(this.#decryptGroupContent(inbound, roomId, userId, encryptedMessage, expectedType));
        inbound?.free();
      }
    });
  }

  /**
   * Destroys the instance by disposing internal resources and removing all event listeners.
   *
   * This method ensures a clean shutdown of the instance by first calling `dispose()`—which is expected
   * to release external or internal resources (such as timers or memory references)—and then
   * removes all listeners from both `#events` and `#sysEvents` to prevent memory leaks or unintended behavior.
   *
   * It should be called when the instance is no longer needed.
   *
   * @returns {Promise<void>} Resolves when cleanup is complete.
   */
  async destroy() {
    await this.dispose();
    this.#events.removeAllListeners();
    this.#sysEvents.removeAllListeners();
  }
}

export default TinyOlmInstance;
