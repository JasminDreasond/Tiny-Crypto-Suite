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
   * Creates a new TinyOlm instance for a specific username.
   *
   * @param {string} username - The username to associate with the account and sessions.
   * @param {string} deviceId - The device id to associate with the account and sessions.
   */
  constructor(username, deviceId) {
    /** @type {string} */
    this.username = username;

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
   * Validates that a given username follows the Matrix user ID format.
   *
   * A valid Matrix user ID must start with '@', contain at least one character,
   * then a ':', followed by at least one character (e.g., "@user:domain.com").
   *
   * @param {string} username - The Matrix user ID to validate.
   * @throws {Error} Throws an error if the username does not match the expected format.
   * @returns {void}
   */
  checkUsername(username) {
    if (!/^@.+:.+$/.test(username)) throw new Error('Invalid Matrix user ID format.');
  }

  /**
   * Retrieves all active sessions.
   *
   * @returns {Map<string, Olm.Session>} A map of all active sessions where the key is the username.
   */
  getAllSessions() {
    return this.sessions;
  }

  /**
   * Retrieves the session for a specific username.
   *
   * @param {string} username - The username whose session is to be retrieved.
   * @returns {Olm.Session} The session for the specified username, or null if no session exists.
   * @throws {Error} Throws an error if no session exists for the specified username.
   */
  getSession(username) {
    const session = this.sessions.get(username);
    if (!session) throw new Error(`No session found with ${username}`);
    return session;
  }

  /**
   * Removes the session for a specific username.
   *
   * @param {string} username - The username whose session is to be removed.
   * @returns {boolean} Returns true if the session was removed, otherwise false.
   * @throws {Error} Throws an error if no session exists for the specified username.
   */
  removeSession(username) {
    const session = this.getSession(username);
    session.free();
    return this.sessions.delete(username);
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
   * @param {string} [username]
   * @returns {string}
   */
  #getGroupSessionId(roomId, username) {
    return `${username}${typeof roomId === 'string' ? `:${roomId}` : ''}`;
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
  exportGroupSession(roomId) {
    const outboundSession = this.groupSessions.get(roomId);
    if (!outboundSession) throw new Error(`No outbound group session found for room: ${roomId}`);
    return outboundSession.session_key();
  }

  /**
   * Imports an inbound group session using a provided session key.
   * @param {string} roomId
   * @param {string} username
   * @param {string} sessionKey
   * @returns {void}
   */
  importGroupSession(roomId, username, sessionKey) {
    const Olm = tinyOlm.getOlm();
    const inboundSession = new Olm.InboundGroupSession();
    inboundSession.create(sessionKey);
    this.groupInboundSessions.set(this.#getGroupSessionId(roomId, username), inboundSession);
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
   * Returns a specific inbound group session by room ID and username.
   * @param {string} roomId
   * @param {string} [username]
   * @returns {Olm.InboundGroupSession}
   * @throws {Error} If no inbound session exists for the given room and username.
   */
  getInboundGroupSession(roomId, username) {
    const sessionId = this.#getGroupSessionId(roomId, username);
    const session = this.groupInboundSessions.get(sessionId);
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId}, username: ${username}`);
    return session;
  }

  /**
   * Removes a specific inbound group session by room ID and username.
   * @param {string} roomId
   * @param {string} username
   * @returns {boolean} True if a session was removed, false otherwise.
   */
  removeInboundGroupSession(roomId, username) {
    const sessionId = this.#getGroupSessionId(roomId, username);
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
   * @param {string} username
   * @param {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }} encryptedMessage
   * @returns {{ message_index: number; plaintext: string; }}
   * @throws {Error} If no inbound session exists for the given room and username.
   */
  decryptGroupMessage(roomId, username, encryptedMessage) {
    const session = this.groupInboundSessions.get(this.#getGroupSessionId(roomId, username));
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${username}`);
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
   * @param {string} username
   * @param {{
   *   body: string,
   *   session_id: string,
   *   message_index: number
   * }} encryptedMessage
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {{ message_index: number; content: string; }}
   * @throws {Error} If no inbound session exists for the given room and username.
   */
  decryptGroupContent(roomId, username, encryptedMessage, expectedType) {
    const session = this.groupInboundSessions.get(this.#getGroupSessionId(roomId, username));
    if (!session)
      throw new Error(`No inbound group session found for room: ${roomId} and user: ${username}`);
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
          [this.username]: {
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
   * @param {string} theirUsername - The username of the target user.
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
   * @param {string} senderUsername - The username of the sender.
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
   * Checks if there is an active session with a specific username.
   *
   * @param {string} username - The username to check.
   * @returns {boolean} True if a session exists, false otherwise.
   */
  hasSession(username) {
    return this.sessions.has(username);
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

    return {
      device_id: this.deviceId,
      user_id: this.username,
      algorithms: ['m.olm.v1.curve25519-aes-sha2'],
      keys: {
        [`curve25519:${this.deviceId}`]: identityKeys.curve25519,
        [`ed25519:${this.deviceId}`]: identityKeys.ed25519,
      },
      signatures: {
        [this.username]: {
          [`ed25519:${this.deviceId}`]: this.account.sign(
            JSON.stringify({
              algorithms: ['m.olm.v1.curve25519-aes-sha2'],
              device_id: this.deviceId,
              user_id: this.username,
              keys: {
                [`curve25519:${this.deviceId}`]: identityKeys.curve25519,
                [`ed25519:${this.deviceId}`]: identityKeys.ed25519,
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
   * @param {string} toUsername - The username of the recipient.
   * @param {string} plaintext - The plaintext message to encrypt.
   * @returns {EncryptedMessage} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given username.
   */
  encryptMessage(toUsername, plaintext) {
    const session = this.sessions.get(toUsername);
    if (!session) throw new Error(`No session found with ${toUsername}`);
    return session.encrypt(plaintext);
  }

  /**
   * Decrypts a received ciphertext message from a specified user.
   *
   * @param {string} fromUsername - The username of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} ciphertext - The ciphertext to decrypt.
   * @returns {string} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given username.
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
   * @param {string} toUsername - The username of the recipient.
   * @param {*} data - The content to encrypt.
   * @returns {EncryptedMessage} The encrypted message.
   * @throws {Error} Throws an error if no session exists with the given username.
   */
  encrypt(toUsername, data) {
    const plainText = this.isDeep ? this.#parser.serializeDeep(data) : this.#parser.serialize(data);
    return this.encryptMessage(toUsername, plainText);
  }

  /**
   * Decrypts a received data from a specified user.
   *
   * @param {string} fromUsername - The username of the sender.
   * @param {number} messageType - The type of the message (0: pre-key, 1: message).
   * @param {string} plaintext - The decrypted content to decrypt.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {*} The decrypted plaintext message.
   * @throws {Error} Throws an error if no session exists with the given username.
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
