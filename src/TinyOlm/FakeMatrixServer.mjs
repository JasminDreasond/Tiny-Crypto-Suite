// @ts-nocheck

// Simulate a simple server that holds public keys
class FakeMatrixServer {
  constructor() {
    this.identityKeys = new Map(); // username -> identity keys
    this.oneTimeKeys = new Map(); // username -> one time keys
  }

  uploadIdentityKeys(username, identityKeys) {
    this.identityKeys.set(username, identityKeys);
  }

  uploadOneTimeKeys(username, oneTimeKeys) {
    this.oneTimeKeys.set(username, oneTimeKeys);
  }

  fetchIdentityKey(username) {
    return this.identityKeys.get(username)?.curve25519;
  }

  fetchOneTimeKey(username) {
    const keys = this.oneTimeKeys.get(username);
    if (!keys) return null;
    const [keyId, keyObj] = Object.entries(keys)[0];
    delete keys[keyId];
    return keyObj.key; // usa o key direto
  }
}

export default FakeMatrixServer;
