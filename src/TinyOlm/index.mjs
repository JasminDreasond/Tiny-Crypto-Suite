// @ts-nocheck
import tinyOlm from './Module.mjs';

class TinyOlm {
  constructor(username) {
    this.username = username;
    this.account = null;
    this.sessions = new Map(); // key: username, value: Olm.Session
  }

  async init() {
    const Olm = await tinyOlm.fetchOlm();
    this.account = new Olm.Account();
    this.account.create();
  }

  getIdentityKeys() {
    return JSON.parse(this.account.identity_keys());
  }

  generateOneTimeKeys(number = 10) {
    this.account.generate_one_time_keys(number);
    this.#_signOneTimeKeys();
  }

  #_signOneTimeKeys() {
    const oneTimeKeys = this.getOneTimeKeys();
    const Olm = tinyOlm.getOlm();
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
    this.signedOneTimeKeys = signedKeys;
  }

  getOneTimeKeys() {
    return JSON.parse(this.account.one_time_keys());
  }

  markKeysAsPublished() {
    this.account.mark_keys_as_published();
  }

  createOutboundSession(theirIdentityKey, theirOneTimeKey, theirUsername) {
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_outbound(this.account, theirIdentityKey, theirOneTimeKey);
    this.sessions.set(theirUsername, session);
  }

  createInboundSession(senderIdentityKey, ciphertext, senderUsername) {
    const Olm = tinyOlm.getOlm();
    const session = new Olm.Session();
    session.create_inbound_from(this.account, senderIdentityKey, ciphertext);
    this.account.remove_one_time_keys(session);
    this.sessions.set(senderUsername, session);
  }

  hasSession(username) {
    return this.sessions.has(username);
  }

  encryptMessage(toUsername, plaintext) {
    const session = this.sessions.get(toUsername);
    if (!session) {
      throw new Error(`No session found with ${toUsername}`);
    }
    return session.encrypt(plaintext);
  }

  decryptMessage(fromUsername, messageType, ciphertext) {
    const session = this.sessions.get(fromUsername);
    if (!session) {
      throw new Error(`No session found with ${fromUsername}`);
    }
    return session.decrypt(messageType, ciphertext);
  }
}

export default TinyOlm;
