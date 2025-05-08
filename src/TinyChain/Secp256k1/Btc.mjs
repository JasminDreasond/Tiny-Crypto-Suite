import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import TinySecp256k1 from './index.mjs';

class TinyBtcSecp256k1 extends TinySecp256k1 {
  /** @typedef {import('bs58check/index')} Bs58check */
  /** @typedef {import('bech32/index')} Bech32 */
  /** @typedef {import('elliptic').ec.KeyPair} KeyPair */

  /**
   * Creates an instance of TinyBtcSecp256k1.
   *
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.msgPrefix=null] - Message prefix used during message signing.
   * @param {string|null} [options.privateKey=null] - String representation of the private key.
   * @param {BufferEncoding} [options.privateKeyEncoding='hex'] - Encoding used for the privateKey string.
   */
  constructor({
    msgPrefix = 'Bitcoin Signed Message:\n',
    privateKey = null,
    privateKeyEncoding = 'hex',
  } = {}) {
    super({ msgPrefix, privateKey, privateKeyEncoding });
  }

  /**
   * @param {string|Buffer} message
   * @param {Buffer} signature
   * @param {Object} [options]
   * @param {BufferEncoding} [options.encoding]
   * @param {string} [options.prefix]
   * @param {Buffer} [options.publicKey]
   * @returns {string}
   * @throws {Error}
   */
  recoverMessageKey(message, signature, options = {}) {
    throw new Error('recoverMessageKey is disabled!');
  }

  /**
   * Initializes the internal elliptic key pair using the private key.
   *
   * @returns {Promise<KeyPair>} The elliptic key pair.
   */
  async init() {
    await Promise.all([this.fetchBs58check(), this.fetchElliptic(), this.fetchBech32()]);
    const ec = this.getEc();
    this.keyPair = ec.keyFromPrivate(this.privateKey);
    return this.keyPair;
  }

  /**
   * Dynamically imports the `bech32` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * @returns {Promise<{ base32: Bech32, base32m: Bech32 }>} The loaded `bech32` module.
   */
  async fetchBech32() {
    if (!this.bech32) {
      const bech32 = await import(/* webpackMode: "eager" */ 'bech32').catch(() => {
        console.warn(
          '[Bech32] Warning: "bech32" is not installed. ' +
            'Bech32 requires "bech32" to function properly. ' +
            'Please install it with "npm install bech32".',
        );
        return null;
      });
      if (bech32) {
        // @ts-ignore
        this.bech32Module = bech32?.default ?? bech32;
        this.bech32 = this.bech32Module.bech32;
        this.bech32m = this.bech32Module.bech32m;
      }
    }
    return { base32: this.getBech32(), base32m: this.getBech32m() };
  }

  /**
   * Returns the initialized `bech32` instance from the bech32 module.
   *
   * @returns {Bech32} The bech32 instance.
   * @throws Will throw an error if `bech32` is not initialized.
   */
  getBech32m() {
    if (typeof this.bech32m === 'undefined' || this.bech32m === null)
      throw new Error(
        `Failed to initialize Bech32: Module is ${this.bech32m !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "bech32" is installed.\n' +
          'You can install it by running: npm install bech32',
      );
    // @ts-ignore
    return this.bech32m;
  }

  /**
   * Returns the initialized `bech32` instance from the bech32 module.
   *
   * @returns {Bech32} The bech32 instance.
   * @throws Will throw an error if `bech32` is not initialized.
   */
  getBech32() {
    if (typeof this.bech32 === 'undefined' || this.bech32 === null)
      throw new Error(
        `Failed to initialize Bech32: Module is ${this.bech32 !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "bech32" is installed.\n' +
          'You can install it by running: npm install bech32',
      );
    // @ts-ignore
    return this.bech32;
  }

  /**
   * Dynamically imports the `bs58check` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * @returns {Promise<Bs58check>} The loaded `bs58check` module.
   */
  async fetchBs58check() {
    if (!this.bs58check) {
      const bs58check = await import(/* webpackMode: "eager" */ 'bs58check').catch(() => {
        console.warn(
          '[Bs58check] Warning: "bs58check" is not installed. ' +
            'Bs58check requires "bs58check" to function properly. ' +
            'Please install it with "npm install bs58check".',
        );
        return null;
      });
      if (bs58check) {
        // @ts-ignore
        this.bs58check = bs58check?.default ?? bs58check;
      }
    }
    return this.getBs58check();
  }

  /**
   * Returns the initialized `bs58check` instance from the bs58check module.
   *
   * @returns {Bs58check} The bs58check instance.
   * @throws Will throw an error if `bs58check` is not initialized.
   */
  getBs58check() {
    if (typeof this.bs58check === 'undefined' || this.bs58check === null)
      throw new Error(
        `Failed to initialize Bs58check: Module is ${this.bs58check !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "bs58check" is installed.\n' +
          'You can install it by running: npm install bs58check',
      );
    // @ts-ignore
    return this.bs58check;
  }

  /**
   * Returns the public key in hexadecimal format.
   *
   * @param {boolean} [compressed=true] - Whether to return the compressed version of the key.
   * @returns {string} Hex representation of the public key.
   */
  getPublicKeyHex(compressed = true) {
    return this.getKeyPair().getPublic(compressed, 'hex');
  }

  /**
   * Returns the public address derived from the public key.
   *
   * @param {'p2pkh'|'bech32'} [type='p2pkh'] - The type of address to generate.
   * @param {boolean} [compressed=true] - Whether to use the compressed version of the public key.
   * @returns {string} The public address.
   */
  getAddress(type = 'bech32', compressed = true) {
    const pubKey = Buffer.from(this.getKeyPair().getPublic(compressed, 'array'));
    // Bech32
    if (type === 'bech32') return this.#pubkeyToBech32Address(pubKey);
    // p2pkh
    else if (type === 'p2pkh') return this.#pubkeyToP2pkhAddress(pubKey);
    // Nope
    else throw new Error(`Unsupported address type: ${type}`);
  }

  /**
   * Bitcoin-style varString
   * @param {string} str
   * @returns {Buffer}
   */
  #varStringBuffer(str) {
    const buffer = Buffer.from(str, 'utf8');
    return Buffer.concat([this.#varIntBuffer(buffer.length), buffer]);
  }

  /**
   * Bitcoin-style varInt encoding
   * @param {number} i
   * @returns {Buffer}
   */
  #varIntBuffer(i) {
    if (i < 0xfd) return Buffer.from([i]);
    if (i <= 0xffff) {
      const b = Buffer.alloc(3);
      b[0] = 0xfd;
      b.writeUInt16LE(i, 1);
      return b;
    }
    throw new Error('Too long');
  }

  /**
   * Internal: Computes the Bitcoin-style message hash using double SHA256.
   *
   * @type {(message: string|Buffer, msgPrefix?: string) => Buffer}
   */
  #getMessageHash(message, msgPrefix = '') {
    const buffMsg = !Buffer.isBuffer(message) ? message : message.toString('utf8');
    const fullMessage = Buffer.concat([
      this.#varStringBuffer(msgPrefix),
      this.#varStringBuffer(buffMsg),
    ]);
    return TinySecp256k1.doubleSha256(fullMessage);
  }

  /**
   * RIPEMD160(SHA256(x))
   * @param {Buffer} buffer
   * @returns {Buffer}
   */
  #hash160(buffer) {
    const sha = createHash('sha256').update(buffer).digest();
    return createHash('ripemd160').update(sha).digest();
  }

  /**
   * Generates P2PKH address from public key
   * @param {Buffer} pubKey
   * @returns {string}
   */
  #pubkeyToP2pkhAddress(pubKey) {
    const bs58check = this.getBs58check();
    const pubkeyHash = this.#hash160(pubKey);
    const versioned = Buffer.concat([Buffer.from([0x00]), pubkeyHash]); // Mainnet P2PKH
    return bs58check.encode(versioned);
  }

  /**
   * Generates Bech32 address from public key
   * @param {Buffer} pubKey
   * @returns {string}
   */
  #pubkeyToBech32Address(pubKey) {
    const bech32 = this.getBech32();
    const ripemd160 = this.#hash160(pubKey);
    // Convert for bech32: witness version 0 + program (ripemd160 result)
    const words = bech32.toWords(ripemd160);
    words.unshift(0x00); // witness version
    return bech32.encode('bc', words); // bc = mainnet
  }

  /**
   * Verifies a signed message using the given public key.
   *
   * @param {string|Buffer} message - The original message.
   * @param {string|Buffer} signature - Signature in DER format (base64-encoded or Buffer).
   * @param {Object} [options] - Verification options.
   * @param {BufferEncoding} [options.encoding='base64'] - Encoding of the signature if it's a string.
   * @param {string} [options.prefix=this.msgPrefix] - Message prefix.
   * @returns {string|null} The recovered compressed public key in hex format, or null if recovery fails.
   */
  recoverMessage(message, signature, options = {}) {
    const ec = this.getEc();
    const { encoding = 'utf8', prefix = this.msgPrefix } = options;
    const sigBuf = typeof signature === 'string' ? Buffer.from(signature, encoding) : signature;
    const msgHash = this.#getMessageHash(message, prefix);
    if (sigBuf.length !== 65) return null;

    const header = sigBuf[0];
    const recid = (header - 27) & 3;
    const r = sigBuf.subarray(1, 33);
    const s = sigBuf.subarray(33, 65);
    const pubKey = ec.recoverPubKey(msgHash, { r, s }, recid);
    return this.#pubkeyToBech32Address(Buffer.from(pubKey.encodeCompressed()));
  }

  /**
   * Signs a message using the instance's private key with a Bitcoin-style prefix and double SHA256 hashing.
   *
   * @param {string} message - The message to be signed.
   * @param {Object} [options={}] - Optional signing parameters.
   * @param {BufferEncoding} [options.encoding='utf8'] - Encoding for input message if it is a string.
   * @param {string} [options.prefix] - Optional prefix (defaults to Bitcoin prefix or instance default).
   * @returns {Buffer} The signature.
   * @throws {Error} If no private key is available.
   */
  signMessage(message, options = {}) {
    const keyPair = this.getKeyPair();
    const { prefix = this.msgPrefix } = options;
    const hash = this.#getMessageHash(message, prefix);

    const signature = keyPair.sign(hash, { canonical: true });
    const r = signature.r.toArrayLike(Buffer, 'be', 32);
    const s = signature.s.toArrayLike(Buffer, 'be', 32);

    // Calculate recid (recovery param)
    const recid = signature.recoveryParam;
    if (recid === null) throw new Error('No!');
    const header = 27 + recid;
    const sigBuffer = Buffer.concat([Buffer.from([header]), r, s]);
    return sigBuffer;
  }
}

export default TinyBtcSecp256k1;
