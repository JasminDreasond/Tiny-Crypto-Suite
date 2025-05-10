import { Buffer } from 'buffer';
import TinySecp256k1 from './index.mjs';

class TinyEthSecp256k1 extends TinySecp256k1 {
  /** @typedef {import('js-sha3')} JsSha3 */
  /** @typedef {import('elliptic').ec.KeyPair} KeyPair */
  /** @typedef {import('./index.mjs').ValidationResult} ValidationResult */

  /**
   * Creates an instance of TinyEthSecp256k1.
   *
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.prefix='0x'] - Crypto prefix used during message verification.
   * @param {'keccak256'} [options.type='keccak256'] - The type of address to generate.
   * @param {string|null} [options.msgPrefix='\x19Ethereum Signed Message:\n'] - Message prefix used during message signing.
   * @param {string|null} [options.privateKey=null] - String representation of the private key.
   * @param {BufferEncoding} [options.privateKeyEncoding='hex'] - Encoding used for the privateKey string.
   */
  constructor({
    prefix = '0x',
    type = 'keccak256',
    msgPrefix = '\x19Ethereum Signed Message:\n',
    privateKey = null,
    privateKeyEncoding = 'hex',
  } = {}) {
    super({ type, prefix, msgPrefix, privateKey, privateKeyEncoding });

    this.types['keccak256'] = this.prefix;
    this.prefixes[this.types['keccak256']] = 'keccak256';
  }

  /**
   * Initializes the internal elliptic key pair using the private key.
   *
   * @returns {Promise<KeyPair>} The elliptic key pair.
   */
  async init() {
    await Promise.all([this.fetchElliptic(), this.fetchJsSha3()]);
    const ec = this.getEc();
    this.keyPair = ec.keyFromPrivate(this.privateKey);
    return this.keyPair;
  }

  /**
   * Dynamically imports the `jsSha3` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * @returns {Promise<JsSha3>} The loaded `jsSha3` module.
   */
  async fetchJsSha3() {
    if (!this.jsSha3) {
      const jsSha3 = await import(/* webpackMode: "eager" */ 'js-sha3').catch(() => {
        console.warn(
          '[JsSha3] Warning: "js-sha3" is not installed. ' +
            'JsSha3 requires "js-sha3" to function properly. ' +
            'Please install it with "npm install js-sha3".',
        );
        return null;
      });
      if (jsSha3) {
        // @ts-ignore
        this.jsSha3 = jsSha3?.default ?? jsSha3;
      }
    }
    return this.getJsSha3();
  }

  /**
   * Returns the initialized `jsSha3` instance from the jsSha3 module.
   *
   * @returns {JsSha3} The jsSha3 instance.
   * @throws Will throw an error if `jsSha3` is not initialized.
   */
  getJsSha3() {
    if (typeof this.jsSha3 === 'undefined' || this.jsSha3 === null)
      throw new Error(
        `Failed to initialize JsSha3: Module is ${this.jsSha3 !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "js-sha3" is installed.\n' +
          'You can install it by running: npm install js-sha3',
      );
    // @ts-ignore
    return this.jsSha3;
  }

  /**
   * Apply EIP-55 checksum to a lowercase address.
   * @param {string} address - Hex string without 0x prefix.
   * @returns {string}
   */
  #toChecksumAddress(address) {
    const { keccak256 } = this.getJsSha3();
    const hash = keccak256(address.toLowerCase());
    let checksumAddress = this.getPrefix();
    for (let i = 0; i < address.length; i++) {
      const char = address[i];
      const hashChar = parseInt(hash[i], 16);
      checksumAddress += hashChar >= 8 ? char.toUpperCase() : char.toLowerCase();
    }

    return checksumAddress;
  }

  /**
   * Generate the Ethereum address from the public key.
   *
   * @param {Buffer} pubKey
   * @returns {string}
   */
  #getAddress(pubKey) {
    const { keccak256 } = this.getJsSha3();
    const addressBuf = Buffer.from(keccak256.arrayBuffer(pubKey)).subarray(-20);
    const addressHex = [...addressBuf].map((b) => b.toString(16).padStart(2, '0')).join('');
    return this.#toChecksumAddress(addressHex);
  }

  /**
   * Returns the public key in hexadecimal.
   * @returns {string}
   */
  getPublicKeyHex() {
    return this.getKeyPair().getPublic(false, 'hex');
  }

  /**
   * Generate the Ethereum address from the public key.
   * @param {Buffer} [pubKey=this.getPublicKeyBuffer(false).subarray(1)] - The pubKey buffer (remove byte 0x04).
   * @returns {string}
   */
  getAddress(pubKey = this.getPublicKeyBuffer(false).subarray(1)) {
    return this.#getAddress(pubKey);
  }

  /**
   * Returns the public key in vanilla format.
   *
   * @returns {Buffer} Hash160 representation of the public key.
   */
  getPubVanillaAddress() {
    return this.#addressToVanilla(this.getAddress());
  }

  /**
   * @param {string} address
   * @returns {Buffer}
   */
  #addressToVanilla(address) {
    let addr = '';
    if (address.startsWith(this.getPrefix())) addr = address.slice(this.getPrefix().length);
    if (addr.length !== 40) throw new Error('Invalid Ethereum address length');
    return Buffer.from(addr, 'hex');
  }

  /**
   * Returns the address in keccak256 format.
   *
   * @param {string} address - Whether to return the compressed version of the key.
   * @returns {Buffer} - Hash160 representation of the public key.
   */
  addressToVanilla(address) {
    return this.#addressToVanilla(address);
  }

  /**
   * Validates a Ethereum address.
   *
   * @param {string} address - The address string to validate.
   * @param {string} [type=this.getType()] - The type of address to generate.
   * @returns {ValidationResult}
   */
  // @ts-ignore
  validateAddress(address, type = this.getType()) {
    /** @type {ValidationResult} */
    const result = { valid: false, type: null };
    if (typeof address !== 'string') return result;

    const prefix = this.getPrefix();
    if (!address.startsWith(prefix)) return result;

    const stripped = address.slice(prefix.length);
    if (!/^[0-9a-fA-F]{40}$/.test(stripped)) return result;

    // Accept lowercase or checksum format, but not mixed invalid case
    const lower = stripped.toLowerCase();
    const checksummed = this.#toChecksumAddress(lower);
    if (address === checksummed || address === prefix + lower) {
      result.valid = true;
      result.type = 'keccak256';
    }

    return result;
  }

  /**
   * Sign a message using Ethereum prefix.
   * @param {string|Buffer} message - The message to be signed.
   * @param {Object} [options] - Optional signing parameters.
   * @param {BufferEncoding} [options.encoding='utf8'] - Encoding for input message if it is a string.
   * @param {string} [options.prefix] - Optional prefix (defaults to Ethereum prefix or instance default).
   * @returns {Buffer} The signature.
   */
  signMessage(message, options = {}) {
    const { keccak256 } = this.getJsSha3();
    const keyPair = this.getKeyPair();
    const { prefix = this.getMsgPrefix(), encoding = 'utf8' } = options;
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, encoding);
    const ethMessage = Buffer.concat([Buffer.from(`${prefix}${msgBuffer.length}`), msgBuffer]);
    const msgHash = Buffer.from(keccak256.arrayBuffer(ethMessage));

    const sig = keyPair.sign(msgHash, { canonical: true });

    // Calculate recid (recovery param)
    const recid = sig.recoveryParam;
    if (recid === null)
      throw new Error(
        'Failed to calculate recovery param (recid) from signature. Signature may be invalid or keyPair is not properly initialized.',
      );

    const r = sig.r.toArrayLike(Buffer, 'be', 32);
    const s = sig.s.toArrayLike(Buffer, 'be', 32);
    const v = Buffer.from([recid + 27]);
    return Buffer.concat([r, s, v]);
  }

  /**
   * Recovers the address from the message and the signature.
   * @param {string|Buffer} message The original message.
   * @param {Buffer|string} signature - Signature in DER format (base64-encoded or Buffer).
   * @param {Object} [options] - Optional signing parameters.
   * @param {BufferEncoding} [options.encoding='utf8'] - Encoding for input message if it is a string.
   * @param {string} [options.prefix] - Optional prefix (defaults to Ethereum prefix or instance default).
   * @returns {string|null}
   */
  recoverMessage(message, signature, options = {}) {
    const { keccak256 } = this.getJsSha3();
    const { prefix = this.getMsgPrefix(), encoding = 'utf8' } = options;
    const sigBuf = typeof signature === 'string' ? Buffer.from(signature, 'hex') : signature;
    if (sigBuf.length !== 65) return null;

    const r = sigBuf.subarray(0, 32);
    const s = sigBuf.subarray(32, 64);
    const vRaw = sigBuf[64];
    if (vRaw !== 27 && vRaw !== 28) return null;
    const v = vRaw - 27;

    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, encoding);
    const ethMessage = Buffer.concat([Buffer.from(`${prefix}${msgBuffer.length}`), msgBuffer]);
    const msgHash = Buffer.from(keccak256.arrayBuffer(ethMessage));

    const ec = this.getEc();
    const pubKey = ec.recoverPubKey(msgHash, { r, s }, v);
    const pubBuffer = Buffer.from(pubKey.encode('array', false)).subarray(1);
    return this.#getAddress(pubBuffer);
  }
}

export default TinyEthSecp256k1;
