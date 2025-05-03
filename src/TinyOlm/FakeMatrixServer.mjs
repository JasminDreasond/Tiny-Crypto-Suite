import clone from 'clone';

/**
 * Simulates a basic Matrix server handling identity and one-time keys.
 * @class
 */
class FakeMatrixServer {
  constructor() {
    /**
     * @type {Map<string, {curve25519: string, ed25519: string}>}
     */
    this.identityKeys = new Map();

    /**
     * @type {Map<string, Record<string, {key: string}>>}
     */
    this.oneTimeKeys = new Map();
  }

  /**
   * Uploads the identity keys for a user.
   * @param {string} username - The user's Matrix ID.
   * @param {{curve25519: string, ed25519: string}} identityKeys - The user's identity keys.
   */
  uploadIdentityKeys(username, identityKeys) {
    this.identityKeys.set(username, clone(identityKeys));
  }

  /**
   * Uploads one-time keys for a user.
   * @param {string} username - The user's Matrix ID.
   * @param {Record<string, {key: string}>} oneTimeKeys - One-time keys.
   */
  uploadOneTimeKeys(username, oneTimeKeys) {
    this.oneTimeKeys.set(username, clone(oneTimeKeys));
  }

  /**
   * Fetches the Curve25519 identity key for a user.
   * @param {string} username - The user's Matrix ID.
   * @returns {string|null} The Curve25519 key or null if not found.
   */
  fetchIdentityKey(username) {
    return clone(this.identityKeys.get(username))?.curve25519 ?? null;
  }

  /**
   * Fetches and removes a one-time key for a user.
   * @param {string} username - The user's Matrix ID.
   * @returns {string|null} The one-time key or null if none available.
   */
  fetchOneTimeKey(username) {
    const keys = this.oneTimeKeys.get(username);
    if (!keys || Object.keys(keys).length === 0) {
      console.warn(`[Server] No one-time keys left for ${username}`);
      return null;
    }
    const [keyId, keyObj] = Object.entries(keys)[0];
    delete keys[keyId];
    return clone(keyObj.key);
  }
}

export default FakeMatrixServer;
