import { randomBytes, createHash } from 'crypto';
import { Buffer } from 'buffer';

// helpers

/**
 * Computes SHA-256 hash of the input buffer.
 *
 * @param {Buffer} buf - The buffer to hash.
 * @returns {Buffer} The SHA-256 hash of the input.
 */
function sha256(buf) {
  return createHash('sha256').update(buf).digest();
}

/**
 * Computes double SHA-256 hash of the input buffer.
 *
 * @param {Buffer} buf - The buffer to hash.
 * @returns {Buffer} The double SHA-256 hash of the input.
 */
function doubleSha256(buf) {
  return sha256(sha256(buf));
}

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
 *   prefix: '\x18MyApp Signed Message:\n',
 *   privateKey: 'a1b2c3...',
 *   privateKeyEncoding: 'hex'
 * });
 * await signer.init();
 * const sig = signer.signMessageWithRecovery('hello');
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
  #prefix = '\x18Tinychain Signed Message:\n';

  /**
   * Creates an instance of TinySecp256k1.
   *
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.prefix=null] - Message prefix used during message signing.
   * @param {string|null} [options.privateKey=null] - String representation of the private key.
   * @param {BufferEncoding} [options.privateKeyEncoding='hex'] - Encoding used for the privateKey string.
   */
  constructor({ prefix = null, privateKey = null, privateKeyEncoding = 'hex' } = {}) {
    if (typeof prefix === 'string') this.#prefix = prefix;
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
    const hash = sha256(msgBuffer); // one SHA256 pass
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
    const hash = sha256(msgBuffer);
    const key = ec.keyFromPublic(pubKeyHex, 'hex');
    return key.verify(hash, signatureBuffer);
  }

  /**
   * Recovers the public key from a signed message.
   *
   * @param {string|Buffer} message - The original message string or buffer.
   * @param {Buffer} signature - The signature buffer (must include recovery param).
   * @returns {string|null} Recovered public key in hex format or null if invalid.
   */
  recoverMessage(message, signature) {
    const ec = this.getEc();
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
    const prefix = Buffer.from(this.#prefix + msgBuffer.length);
    const fullMessage = Buffer.concat([prefix, msgBuffer]);
    const hash = doubleSha256(fullMessage); // Bitcoin/Ethereum-style prefixing

    if (signature.length !== 65) {
      console.warn('[recoverMessage] Signature must be 65 bytes (r + s + recovery param).');
      return null;
    }

    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    const recoveryParam = signature[64];

    try {
      const pubKey = ec.recoverPubKey(hash, { r, s }, recoveryParam);
      return pubKey.encodeCompressed('hex'); // use 'false' for uncompressed
    } catch (err) {
      console.warn('[recoverMessage] Failed to recover public key:', err);
      return null;
    }
  }

  /**
   * Signs a message and returns a 65-byte recoverable signature.
   *
   * @param {string|Buffer} message - The original message string or buffer.
   * @returns {Buffer} The signature with recovery param (65 bytes total).
   */
  signMessageWithRecovery(message) {
    const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
    const prefix = Buffer.from(this.#prefix + msgBuffer.length);
    const fullMessage = Buffer.concat([prefix, msgBuffer]);
    const hash = doubleSha256(fullMessage); // Same hash style as recoverMessage

    const { r, s, recoveryParam } = this.getKeyPair().sign(hash, { canonical: true });

    if (typeof recoveryParam !== 'number') {
      throw new Error('[signMessageWithRecovery] Missing recovery param from signature');
    }

    const rBuf = r.toArrayLike(Buffer, 'be', 32);
    const sBuf = s.toArrayLike(Buffer, 'be', 32);
    const vBuf = Buffer.from([recoveryParam]);

    return Buffer.concat([rBuf, sBuf, vBuf]); // 65 bytes total
  }
}

export default TinySecp256k1;
