import tinyOlm from './Module.mjs';

/**
 * TinyOlm is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
 *
 * @beta
 * @class
 */
class TinyOlm {
  /**
   * Creates a new TinyOlm instance for a specific username.
   *
   * @param {string} username - The username to associate with the account and sessions.
   */
  constructor(username) {
    /** @type {string} */
    this.username = username;

    /** @type {Olm.Account|null} */
    this.account = null;

    /** @type {Map<string, Olm.Session>} */
    this.sessions = new Map();
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
   * Encrypts a plaintext message to a specified user.
   *
   * @param {string} toUsername - The username of the recipient.
   * @param {string} plaintext - The plaintext message to encrypt.
   * @returns {{ type: 0 | 1; body: string}} The encrypted message.
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
    return session.decrypt(messageType, ciphertext);
  }
}

export default TinyOlm;
