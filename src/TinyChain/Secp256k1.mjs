import { randomBytes, createHash } from 'crypto';
import { Buffer } from 'buffer';

/**
 * A minimal wrapper around the `secp256k1` elliptic curve cryptography using the `elliptic` library.
 * Provides functionality for creating and managing an elliptic key pair, signing messages,
 * verifying signatures, and recovering public keys from signed messages.
 *
 * This class is designed to be lightweight, dependency-lazy (loads `elliptic` only when needed),
 * and optionally compatible with Bitcoin/Ethereum-style message prefixes and signature formats.
 *
 * ### Features:
 * - Generates or imports a private key with configurable encoding.
 * - Uses `secp256k1` curve via `elliptic` library.
 * - Supports signing messages (SHA-256 and double SHA-256).
 * - Supports recoverable signatures with 65-byte format.
 * - Allows recovery of public keys from messages and signatures.
 * - Verifies ECDSA signatures.
 *
 * ### Usage:
 * ```js
 * const signer = new TinySecp256k1({
 *   msgPrefix: '\x18MyApp Signed Message:\n',
 *   privateKey: 'a1b2c3...',
 *   privateKeyEncoding: 'hex'
 * });
 * await signer.init();
 * const sig = signer.signMessage('hello');
 * const pubKey = signer.recoverMessage('hello', sig);
 * ```
 *
 * ### Internal Notes:
 * - Internally uses lazy loading for `elliptic`, allowing the class to be used
 *   in contexts where `elliptic` may not yet be installed.
 * - The message prefix format mimics Bitcoin/Ethereum message signing,
 *   allowing compatibility with common recovery mechanisms.
 * - Signatures are canonical and encoded in DER or recoverable formats (r, s, v).
 *
 * @class
 */
class TinySecp256k1 {
  /** @typedef {import('elliptic')} Elliptic */
  /** @typedef {import('elliptic').ec} ec */
  /** @typedef {import('elliptic').ec.KeyPair} KeyPair */
  msgPrefix = '\x18Tinychain Signed Message:\n';

  /**
   * Computes SHA-256 hash of the input buffer.
   *
   * @param {Buffer} buf - The buffer to hash.
   * @returns {Buffer} The SHA-256 hash of the input.
   */
  static sha256(buf) {
    return createHash('sha256').update(buf).digest();
  }

  /**
   * Computes double SHA-256 hash of the input buffer.
   *
   * @param {Buffer} buf - The buffer to hash.
   * @returns {Buffer} The double SHA-256 hash of the input.
   */
  static doubleSha256(buf) {
    return TinySecp256k1.sha256(TinySecp256k1.sha256(buf));
  }

  /**
   * Creates an instance of TinySecp256k1.
   *
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.msgPrefix=null] - Message prefix used during message signing.
   * @param {string|null} [options.privateKey=null] - String representation of the private key.
   * @param {BufferEncoding} [options.privateKeyEncoding='hex'] - Encoding used for the privateKey string.
   */
  constructor({ msgPrefix = null, privateKey = null, privateKeyEncoding = 'hex' } = {}) {
    if (typeof msgPrefix === 'string') this.msgPrefix = msgPrefix;
    this.privateKey = privateKey ? Buffer.from(privateKey, privateKeyEncoding) : randomBytes(32);
  }

  /**
   * Initializes the internal elliptic key pair using the private key.
   *
   * @returns {Promise<KeyPair>} The elliptic key pair.
   */
  async init() {
    const ec = await this.fetchElliptic();
    this.keyPair = ec.keyFromPrivate(this.privateKey);
    return this.keyPair;
  }

  /**
   * Returns the elliptic key pair generated from the private key.
   *
   * @returns {KeyPair} The elliptic key pair.
   * @throws {Error} If the key pair is not initialized (init() was not called).
   */
  getKeyPair() {
    if (!this.keyPair)
      throw new Error(
        '[getKeyPair] Key pair is not initialized. Please call init() before using getKeyPair().',
      );
    return this.keyPair;
  }

  /**
   * Dynamically imports the `elliptic` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * @returns {Promise<ec>} The loaded `elliptic` module.
   */
  async fetchElliptic() {
    if (!this.Elliptic) {
      const Elliptic = await import(/* webpackMode: "eager" */ 'elliptic').catch(() => {
        console.warn(
          '[Elliptic] Warning: "elliptic" is not installed. ' +
            'Elliptic requires "elliptic" to function properly. ' +
            'Please install it with "npm install elliptic".',
        );
        return null;
      });
      if (Elliptic) {
        // @ts-ignore
        this.Elliptic = Elliptic?.default ?? Elliptic;
        const EC = this.Elliptic.ec;
        this.ec = new EC('secp256k1');
      }
    }
    return this.getEc();
  }

  /**
   * Returns the initialized `ec` instance from the elliptic module.
   *
   * @returns {ec} The elliptic curve instance (secp256k1).
   * @throws Will throw an error if `ec` is not initialized.
   */
  getEc() {
    if (typeof this.ec === 'undefined' || this.ec === null)
      throw new Error(
        `Failed to initialize Elliptic: Module is ${this.ec !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "elliptic" is installed.\n' +
          'You can install it by running: npm install elliptic',
      );
    return this.ec;
  }

  /**
   * Returns the loaded `Elliptic` module.
   *
   * @returns {Elliptic} The elliptic module.
   * @throws Will throw an error if the module is not initialized.
   */
  getElliptic() {
    if (typeof this.Elliptic === 'undefined' || this.Elliptic === null)
      throw new Error(
        `Failed to initialize Elliptic: Module is ${this.Elliptic !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "elliptic" is installed.\n' +
          'You can install it by running: npm install elliptic',
      );
    return this.Elliptic;
  }

  /**
   * Returns the private key in hexadecimal format.
   *
   * @returns {string} Hex representation of the private key.
   */
  getPrivateKeyHex() {
    return this.privateKey.toString('hex');
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
   * Signs a message using ECDSA and returns the DER-encoded signature.
   *
   * @param {string|Buffer} message - The message to sign.
   * @param {BufferEncoding} [encoding='utf8'] - Encoding if message is a string.
   * @returns {Buffer} DER-encoded signature buffer.
   */
  signECDSA(message, encoding = 'utf8') {
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, encoding);
    const hash = TinySecp256k1.doubleSha256(msgBuffer);
    const signature = this.getKeyPair().sign(hash, { canonical: true });
    return Buffer.from(signature.toDER());
  }

  /**
   * Verifies an ECDSA signature against a message and a public key.
   *
   * @param {string|Buffer} message - The original message to verify.
   * @param {Buffer} signatureBuffer - The signature buffer to validate.
   * @param {string} pubKeyHex - The public key in hex format.
   * @param {BufferEncoding} [encoding] - Encoding if the message is a string.
   * @returns {boolean} `true` if valid, `false` otherwise.
   */
  verifyECDSA(message, signatureBuffer, pubKeyHex, encoding) {
    const ec = this.getEc();
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, encoding);
    const hash = TinySecp256k1.doubleSha256(msgBuffer);
    const key = ec.keyFromPublic(pubKeyHex, 'hex');
    return key.verify(hash, signatureBuffer);
  }

  /**
   * Normalizes a 65-byte compact ECDSA signature into its r, s, and v components.
   *
   * @param {Buffer} signature - A 65-byte buffer in the format [r (32) | s (32) | v (1)].
   * @returns {{ r: Buffer, s: Buffer, v: number }} The signature components.
   * @throws {Error} If the signature length is invalid or recovery param is out of range.
   */
  #normalizeSignature(signature) {
    if (signature.length === 65) {
      let v = signature[64];
      if (v >= 27) v -= 27;
      if (v < 0 || v > 3) throw new Error('Invalid recovery param (v): must be 0, 1, 2, or 3');
      return {
        r: signature.subarray(0, 32),
        s: signature.subarray(32, 64),
        v,
      };
    } else throw new Error('Invalid signature length. Expected 65 bytes (r+s+v)');
  }

  /**
   * @type {(message: string|Buffer, encoding: BufferEncoding, prefix?: string) => Buffer}
   */
  #getMessageHash(message, encoding, prefix = '\x18Bitcoin Signed Message:\n') {
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, encoding);
    const msgPrefix = Buffer.from(prefix + msgBuffer.length);
    const fullMessage = Buffer.concat([msgPrefix, msgBuffer]);
    const hash = TinySecp256k1.doubleSha256(fullMessage);
    return hash;
  }

  /**
   * Recovers the public key from a signed message and signature with recovery param.
   *
   * @param {string|Buffer} message - The original signed message.
   * @param {Buffer} signature - A 65-byte compact signature buffer (r + s + v).
   * @param {Object} [options] - Options for decoding the message hash.
   * @param {BufferEncoding} [options.encoding='hex'] - The encoding of the input message.
   * @param {string} [options.prefix=this.msgPrefix] - Optional prefix used before hashing the message.
   * @returns {string} The recovered compressed public key in hex format, or null if recovery fails.
   * @throws {Error} If the encoding type is unsupported or signature is invalid.
   */
  recoverMessage(message, signature, options = {}) {
    const ec = this.getEc();
    const { encoding = 'hex', prefix = this.msgPrefix } = options;
    const hash = this.#getMessageHash(message, encoding, prefix);

    const { r, s, v } = this.#normalizeSignature(signature);
    const pubKey = ec.recoverPubKey(hash, { r, s }, v);
    return pubKey.encodeCompressed('hex');
  }

  /**
   * Signs a message using ECDSA and includes the recovery param in the result.
   *
   * @param {string|Buffer} message - The message to sign.
   * @param {Object} [options] - Options for the message hashing process.
   * @param {BufferEncoding} [options.encoding='hex'] - The encoding used for string messages.
   * @param {string} [options.prefix=this.msgPrefix] - Optional message prefix for the hash.
   * @returns {Buffer} A 65-byte recoverable signature (r + s + v).
   * @throws {Error} If recovery param is missing or encoding type is unsupported.
   */
  signMessage(message, options = {}) {
    const keyPair = this.getKeyPair();
    const { encoding = 'hex', prefix = this.msgPrefix } = options;
    const hash = this.#getMessageHash(message, encoding, prefix);

    const { r, s, recoveryParam } = keyPair.sign(hash, { canonical: true });
    if (typeof recoveryParam !== 'number')
      throw new Error('[signMessage] Missing recovery param from signature');

    const rBuf = r.toArrayLike(Buffer, 'be', 32);
    const sBuf = s.toArrayLike(Buffer, 'be', 32);
    const vBuf = Buffer.from([recoveryParam]);

    return Buffer.concat([rBuf, sBuf, vBuf]); // 65 bytes total
  }
}

export default TinySecp256k1;
