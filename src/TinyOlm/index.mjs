import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';
import tinyOlm from './Module.mjs';

/**
 * TinyOlm is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
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
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser = new TinyCryptoParser();

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
   * Validates that a given userId follows the Matrix user ID format.
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
  setPassword(newPassword) {
    if (typeof newPassword !== 'string')
      throw new Error('The value provided to password must be a string.');
    this.password = newPassword;
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
  setUserId(newUserId) {
    if (typeof newUserId !== 'string')
      throw new Error('The value provided to userId must be a string.');
    this.userId = newUserId;
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
  setDeviceId(newDeviceId) {
    if (typeof newDeviceId !== 'string')
      throw new Error('The value provided to deviceId must be a string.');
    this.deviceId = newDeviceId;
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
   * Import and restore an Olm account from a pickled string.
   *
   * @param {string} pickled - The pickled Olm account string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {void}
   */
  importAccount(pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const account = new Olm.Account();
    account.unpickle(password, pickled);
    this.account = account;
  }

  /**
   * Import and restore an Olm session from a pickled string.
   *
   * @param {string} key - The session key used to index this session (usually userId or `userId|deviceId`).
   * @param {string} pickled - The pickled Olm session string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {void}
   */
  importSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const sess = new Olm.Session();
    sess.unpickle(password, pickled);
    this.sessions.set(key, sess);
  }

  /**
   * Import and restore an outbound group session from a pickled string.
   *
   * @param {string} key - The key used to index the group session (usually the roomId).
   * @param {string} pickled - The pickled Olm.OutboundGroupSession string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {void}
   */
  importGroupSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const group = new Olm.OutboundGroupSession();
    group.unpickle(password, pickled);
    this.groupSessions.set(key, group);
  }

  /**
   * Import and restore an inbound group session from a pickled string.
   *
   * @param {string} key - The key used to index the inbound group session (usually sender key or `roomId|sender`).
   * @param {string} pickled - The pickled Olm.InboundGroupSession string.
   * @param {string} [password=this.password] - The password used to decrypt the pickle.
   * @returns {void}
   */
  importInboundGroupSession(key, pickled, password = this.getPassword()) {
    const Olm = tinyOlm.getOlm();
    const inbound = new Olm.InboundGroupSession();
    inbound.unpickle(password, pickled);
    this.groupInboundSessions.set(key, inbound);
  }

  /**
   * @param {ExportedOlmInstance} data Returned object of exportInstance
   * @param {string} [password] The password used to pickle
   * @returns {Promise<void>}
   */
  async importInstance(data, password = '') {
    await tinyOlm.fetchOlm();
    if (data.account) this.importAccount(data.account, password);

    if (data.sessions)
      for (const [key, pickled] of Object.entries(data.sessions))
        this.importSession(key, pickled, password);

    if (data.groupSessions)
      for (const [key, pickled] of Object.entries(data.groupSessions))
        this.importGroupSession(key, pickled, password);

    if (data.groupInboundSessions)
      for (const [key, pickled] of Object.entries(data.groupInboundSessions))
        this.importInboundGroupSession(key, pickled, password);
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
   * @returns {boolean} Returns true if the session was removed, otherwise false.
   * @throws {Error} Throws an error if no session exists for the specified userId.
   */
  removeSession(userId) {
    const session = this.getSession(userId);
    session.free();
    return this.sessions.delete(userId);
  }

  /**
   * Clears all active sessions.
   *
   * @returns {void}
   */
  clearSessions() {
    this.sessions.clear();
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
   * @returns {Olm.OutboundGroupSession}
   */
  createGroupSession(roomId) {
    const Olm = tinyOlm.getOlm();
    const outboundSession = new Olm.OutboundGroupSession();
    outboundSession.create();
    this.groupSessions.set(roomId, outboundSession);
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
   * Imports an inbound group session using a provided session key.
   * @param {string} roomId
   * @param {string} userId
   * @param {string} sessionKey
   * @returns {void}
   */
  importGroupSessionId(roomId, userId, sessionKey) {
    const Olm = tinyOlm.getOlm();
    const inboundSession = new Olm.InboundGroupSession();
    inboundSession.create(sessionKey);
    this.groupInboundSessions.set(this.#getGroupSessionId(roomId, userId), inboundSession);
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
   * @returns {boolean} True if a session was removed, false otherwise.
   */
  removeGroupSession(roomId) {
    const session = this.getGroupSession(roomId);
    session.free();
    return this.groupSessions.delete(roomId);
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
   * @returns {boolean} True if a session was removed, false otherwise.
   */
  removeInboundGroupSession(roomId, userId) {
    const sessionId = this.#getGroupSessionId(roomId, userId);
    const session = this.getInboundGroupSession(sessionId);
    session.free();
    return this.groupInboundSessions.delete(sessionId);
  }

  /**
   * Encrypts a plaintext message for a specific room using the outbound group session.
   * @param {string} roomId
   * @param {string} plaintext
   * @returns {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }}
   * @throws {Error} If no outbound session exists for the given room.
   */
  encryptGroupMessage(roomId, plaintext) {
    const session = this.groupSessions.get(roomId);
    if (!session) throw new Error(`No outbound group session found for room: ${roomId}`);

    const ciphertext = session.encrypt(plaintext);
    return {
      body: ciphertext,
      session_id: session.session_id(),
      message_index: session.message_index(),
    };
  }

  /**
   * Decrypts an encrypted group message using the inbound group session.
   * @param {string} roomId
   * @param {string} userId
   * @param {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }} encryptedMessage
   * @returns {{ message_index: number; plaintext: string; }}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  decryptGroupMessage(roomId, userId, encryptedMessage) {
    const session = this.groupInboundSessions.get(this.#getGroupSessionId(roomId, userId));
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${userId}`);
    return session.decrypt(encryptedMessage.body);
  }

  /**
   * Encrypts a content for a specific room using the outbound group session.
   * @param {string} roomId
   * @param {*} data
   * @returns {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }}
   * @throws {Error} If no outbound session exists for the given room.
   */
  encryptGroupContent(roomId, data) {
    const session = this.groupSessions.get(roomId);
    if (!session) throw new Error(`No outbound group session found for room: ${roomId}`);

    const plainText = this.isDeep ? this.#parser.serializeDeep(data) : this.#parser.serialize(data);
    const ciphertext = session.encrypt(plainText);
    return {
      body: ciphertext,
      session_id: session.session_id(),
      message_index: session.message_index(),
    };
  }

  /**
   * Decrypts an encrypted content using the inbound group session.
   * @param {string} roomId
   * @param {string} userId
   * @param {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }} encryptedMessage
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {{ message_index: number; content: string; }}
   * @throws {Error} If no inbound session exists for the given room and userId.
   */
  decryptGroupContent(roomId, userId, encryptedMessage, expectedType) {
    const session = this.groupInboundSessions.get(this.#getGroupSessionId(roomId, userId));
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${userId}`);
    const result = session.decrypt(encryptedMessage.body);

    const { value } = this.isDeep
      ? this.#parser.deserializeDeep(result.plaintext, expectedType)
      : this.#parser.deserialize(result.plaintext, expectedType);
    return { message_index: result.message_index, content: value };
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
   * @returns {void}
   * @throws {Error} Throws an error if account is not initialized.
   */
  generateOneTimeKeys(number = 10) {
    if (!this.account) throw new Error('Account is not initialized.');
    this.account.generate_one_time_keys(number);
    this.#signOneTimeKeys();
  }

  /**
   * Signs the generated one-time keys with the account's identity key.
   *
   * @returns {void}
   * @throws {Error} Throws an error if account is not initialized.
   */
  #signOneTimeKeys() {
    if (!this.account) throw new Error('Account is not initialized.');
    const oneTimeKeys = this.getOneTimeKeys();
    const Olm = tinyOlm.getOlm();
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
   * @returns {void}
   * @throws {Error} Throws an error if account is not initialized.
   */
  markKeysAsPublished() {
    if (!this.account) throw new Error('Account is not initialized.');
    this.account.mark_keys_as_published();
  }

  /**
   * Creates an outbound session with another user using their identity and one-time keys.
   *
   * @param {string} theirIdentityKey - The identity key of the target user.
   * @param {string} theirOneTimeKey - The one-time key of the target user.
   * @param {string} theirUsername - The userId of the target user.
   * @returns {void}
   * @throws {Error} Throws an error if account is not initialized.
   */
  createOutboundSession(theirIdentityKey, theirOneTimeKey, theirUsername) {
    if (!this.account) throw new Error('Account is not initialized.');
    if (!theirOneTimeKey) throw new Error('No one-time key available for the user.');
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_outbound(this.account, theirIdentityKey, theirOneTimeKey);
    this.sessions.set(theirUsername, session);
  }

  /**
   * Creates an inbound session from a received encrypted message.
   *
   * @param {string} senderIdentityKey - The sender's identity key.
   * @param {string} ciphertext - The ciphertext received.
   * @param {string} senderUsername - The userId of the sender.
   * @returns {void}
   * @throws {Error} Throws an error if account is not initialized.
   */
  createInboundSession(senderIdentityKey, ciphertext, senderUsername) {
    if (!this.account) throw new Error('Account is not initialized.');
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_inbound_from(this.account, senderIdentityKey, ciphertext);
    this.account.remove_one_time_keys(session);
    this.sessions.set(senderUsername, session);
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
   * @returns {void}
   */
  dispose() {
    for (const session of this.sessions.values()) session.free();
    this.sessions.clear();
    if (this.account) {
      this.account.free();
      this.account = null;
    }
    for (const inbound of this.groupInboundSessions.values()) inbound.free();
    for (const groupSession of this.groupSessions.values()) groupSession.free();
    this.groupInboundSessions.clear();
    this.groupSessions.clear();
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
    if (this.account) this.account.free();
    const Olm = await tinyOlm.fetchOlm();
    this.account = new Olm.Account();
    this.account.create();
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
   * Encrypts a plaintext message to a specified user.
   *
   * @param {string} toUsername - The userId of the recipient.
   * @param {string} plaintext - The plaintext message to encrypt.
   * @returns {EncryptedMessage} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given userId.
   */
  encryptMessage(toUsername, plaintext) {
    const session = this.sessions.get(toUsername);
    if (!session) throw new Error(`No session found with ${toUsername}`);
    return session.encrypt(plaintext);
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
    const session = this.sessions.get(fromUsername);
    if (!session) throw new Error(`No session found with ${fromUsername}`);
    const plaintext = session.decrypt(messageType, ciphertext);
    // After decrypting, consider the session updated (ratcheted)
    session.has_received_message();
    return plaintext;
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
    const plainText = this.isDeep ? this.#parser.serializeDeep(data) : this.#parser.serialize(data);
    return this.encryptMessage(toUsername, plainText);
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
    const decrypted = this.decryptMessage(fromUsername, messageType, plaintext);
    const { value } = this.isDeep
      ? this.#parser.deserializeDeep(decrypted, expectedType)
      : this.#parser.deserialize(decrypted, expectedType);
    return value;
  }
}

export default TinyOlmInstance;
