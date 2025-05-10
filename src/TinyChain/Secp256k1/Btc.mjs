import { Buffer } from 'buffer';
import TinySecp256k1 from './index.mjs';

class TinyBtcSecp256k1 extends TinySecp256k1 {
  /** @typedef {import('bs58check/index')} Bs58check */
  /** @typedef {import('bech32/index')} Bech32 */
  /** @typedef {import('elliptic').ec.KeyPair} KeyPair */
  /** @typedef {'p2pkh'|'bech32'} PubKeyTypes */
  p2pkhPrefix = 0x00;

  /**
   * Creates an instance of TinyBtcSecp256k1.
   *
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.prefix='bc'] - Crypto prefix used during message verification.
   * @param {number|null} [options.p2pkhPrefix=0x00] - Crypto prefix used during message verification.
   * @param {PubKeyTypes} [options.type=this.getType()] - The type of address to generate.
   * @param {string|null} [options.msgPrefix='Bitcoin Signed Message:\n'] - Message prefix used during message signing.
   * @param {string|null} [options.privateKey=null] - String representation of the private key.
   * @param {BufferEncoding} [options.privateKeyEncoding='hex'] - Encoding used for the privateKey string.
   */
  constructor({
    type = 'bech32',
    p2pkhPrefix = 0x00,
    prefix = 'bc',
    msgPrefix = 'Bitcoin Signed Message:\n',
    privateKey = null,
    privateKeyEncoding = 'hex',
  } = {}) {
    super({ type, prefix, msgPrefix, privateKey, privateKeyEncoding });
    if (p2pkhPrefix !== null && typeof p2pkhPrefix !== 'number')
      throw new Error('p2pkhPrefix must be a number or null');
    if (typeof p2pkhPrefix === 'number') this.p2pkhPrefix = p2pkhPrefix;

    this.types['bech32'] = this.prefix;
    this.prefixes[this.types['bech32']] = 'bech32';
    this.types['p2pkh'] = String(this.p2pkhPrefix);
    this.prefixes[this.types['p2pkh']] = 'p2pkh';
  }

  /**
   * Returns the p2pkh prefix if it's a number.
   *
   * @returns {number}
   * @throws {Error} If p2pkhPrefix is not a number.
   */
  getP2pkhPrefix() {
    if (typeof this.p2pkhPrefix !== 'number')
      throw new Error('[getP2pkhPrefix] p2pkhPrefix must be a number.');
    return this.p2pkhPrefix;
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
   * @param {string} [type=this.getType()] - The type of address to generate.
   * @param {Buffer} [pubKey=this.getPublicKeyBuffer()] - The pubKey buffer.
   * @returns {string} The public address.
   */
  getAddress(pubKey = this.getPublicKeyBuffer(), type = this.getType()) {
    // @ts-ignore
    if (this.isType(type) && typeof this.#pubKeyTo[type] === 'function')
      // @ts-ignore
      return this.#pubKeyTo[type](pubKey);
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

  #pubKeyTo = {
    /**
     * Generates P2PKH address from public key
     * @param {Buffer} pubKey
     * @returns {string}
     */
    p2pkh: (pubKey) => {
      const bs58check = this.getBs58check();
      const pubkeyHash = TinySecp256k1.hash160(pubKey);
      const versioned = Buffer.concat([Buffer.from([this.getP2pkhPrefix()]), pubkeyHash]); // Mainnet P2PKH
      return bs58check.encode(versioned);
    },

    /**
     * Generates Bech32 address from public key
     * @param {Buffer} pubKey
     * @returns {string}
     */
    bech32: (pubKey) => {
      const bech32 = this.getBech32();
      const ripemd160 = TinySecp256k1.hash160(pubKey);
      // Convert for bech32: witness version 0 + program (ripemd160 result)
      const words = bech32.toWords(ripemd160);
      words.unshift(0x00); // witness version
      return bech32.encode(this.getPrefix(), words); // bc = mainnet
    },
  };

  #toHash160 = {
    /**
     * Extracts hash160 from a P2PKH address
     * @param {string} address
     * @returns {Buffer}
     */
    p2pkh: (address) => {
      const bs58check = this.getBs58check();
      const decoded = bs58check.decode(address);
      const prefix = decoded[0];
      if (prefix !== this.getP2pkhPrefix()) {
        throw new Error('Invalid prefix for P2PKH address');
      }
      return decoded.subarray(1); // remove prefix, return hash160
    },

    /**
     * Extracts hash160 from a Bech32 address
     * @param {string} address
     * @returns {Buffer}
     */
    bech32: (address) => {
      const bech32 = this.getBech32();
      const { prefix, words } = bech32.decode(address);
      if (prefix !== this.getPrefix()) {
        throw new Error('Invalid Bech32 prefix');
      }
      const version = words.shift(); // witness version
      if (version !== 0x00) throw new Error('Unsupported witness version');
      return Buffer.from(bech32.fromWords(words)); // this is the original hash160
    },
  };

  /**
   * Returns the address in hash160 format.
   *
   * @param {string} address - Whether to return the compressed version of the key.
   * @param {string} [type=this.getType()] - The type of address to generate.
   * @returns {Buffer} Hash160 representation of the public key.
   */
  addressToVanilla(address, type = this.getType()) {
    // @ts-ignore
    if (this.isType(type) && typeof this.#toHash160[type] === 'function')
      // @ts-ignore
      return this.#toHash160[type](address);
    // Nope
    else throw new Error(`Unsupported address type: ${type}`);
  }

  /**
   * Verifies a signed message using the given public key.
   *
   * @param {string|Buffer} message - The original message.
   * @param {string|Buffer} signature - Signature in DER format (base64-encoded or Buffer).
   * @param {Object} [options] - Verification options.
   * @param {PubKeyTypes} [options.type=this.getType()] - The type of address to generate.
   * @param {BufferEncoding} [options.encoding='base64'] - Encoding of the signature if it's a string.
   * @param {string} [options.prefix=this.getMsgPrefix()] - Message prefix.
   * @returns {string|null} The recovered compressed public key in hex format, or null if recovery fails.
   */
  recoverMessage(message, signature, options = {}) {
    const ec = this.getEc();
    const { encoding = 'utf8', prefix = this.getMsgPrefix(), type = this.getType() } = options;
    const sigBuf = typeof signature === 'string' ? Buffer.from(signature, encoding) : signature;
    const msgHash = this.#getMessageHash(message, prefix);
    if (sigBuf.length !== 65) return null;

    const header = sigBuf[0];
    const recid = (header - 27) & 3;
    const r = sigBuf.subarray(1, 33);
    const s = sigBuf.subarray(33, 65);
    const pubKey = ec.recoverPubKey(msgHash, { r, s }, recid);

    // @ts-ignore
    if (this.isType(type) && typeof this.#pubKeyTo[type] === 'function')
      // @ts-ignore
      return this.#pubKeyTo[type](Buffer.from(pubKey.encodeCompressed()));
    // Nope
    else throw new Error(`Unsupported address type: ${type}`);
  }

  /**
   * Signs a message using the instance's private key with a Bitcoin-style prefix and double SHA256 hashing.
   *
   * @param {string} message - The message to be signed.
   * @param {Object} [options={}] - Optional signing parameters.
   * @param {BufferEncoding} [options.encoding='utf8'] - Encoding for input message if it is a string.
   * @param {string} [options.prefix] - Optional prefix (defaults to Bitcoin prefix or instance default).
   * @returns {Buffer} The signature.
   * @throws {Error} If recovery param could not be calculated.
   */
  signMessage(message, options = {}) {
    const keyPair = this.getKeyPair();
    const { prefix = this.getMsgPrefix() } = options;
    const hash = this.#getMessageHash(message, prefix);

    const signature = keyPair.sign(hash, { canonical: true });
    const r = signature.r.toArrayLike(Buffer, 'be', 32);
    const s = signature.s.toArrayLike(Buffer, 'be', 32);

    // Calculate recid (recovery param)
    const recid = signature.recoveryParam;
    if (recid === null)
      throw new Error(
        'Failed to calculate recovery param (recid) from signature. Signature may be invalid or keyPair is not properly initialized.',
      );
    const header = 27 + recid;
    const sigBuffer = Buffer.concat([Buffer.from([header]), r, s]);
    return sigBuffer;
  }
}

export default TinyBtcSecp256k1;
