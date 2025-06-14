import { Buffer } from 'buffer';
import TinySecp256k1 from './index.mjs';

/**
 * TinySecp256k1Mock is a mock implementation of the TinySecp256k1 class,
 * intended for testing and development environments where full cryptographic
 * functionality is not required.
 *
 * This mock class provides stubbed methods for key and signature operations,
 * returning empty or constant values to simulate the behavior of real cryptographic
 * routines without performing actual computations. It allows predefined public keys
 * and addresses to be injected for deterministic behavior in tests.
 *
 * Usage is ideal in unit tests, validation checks, or environments where
 * cryptographic performance or security is not critical.
 *
 * @class
 */
class TinySecp256k1Mock extends TinySecp256k1 {
  /** @typedef {import('./index.mjs').ValidationResult} ValidationResult */

  /**
   * Creates a new mock instance of TinySecp256k1 for testing purposes.
   * @param {Object} [options] - Optional parameters for the instance.
   * @param {string|null} [options.preAddress=''] - Pre-defined mock address.
   * @param {string|null} [options.preHex=''] - Pre-defined mock public key in hex format.
   * @param {string|null} [options.prefix=''] - Crypto prefix used during message verification.
   * @param {string} [options.type='empty'] - The type of mock address to simulate.
   */
  constructor({ type = 'empty', prefix = '', preAddress = '', preHex = '' } = {}) {
    super({ type, prefix });
    this.types[type] = this.prefix;
    this.prefixes[this.types[this.type]] = this.type;
    if (typeof preAddress !== 'string') throw new Error('preAddress must be a string');
    if (typeof preHex !== 'string') throw new Error('preHex must be a string');
    this.preAddress = preAddress;
    this.preHex = preHex;
  }

  /**
   * Gets the predefined address with strict string validation.
   * @returns {string}
   */
  getPreAddress() {
    if (typeof this.preAddress !== 'string') throw new Error('preAddress is not a string.');
    return this.preAddress;
  }

  /**
   * Gets the predefined public key hex with strict string validation.
   * @returns {string}
   */
  getPreHex() {
    if (typeof this.preHex !== 'string') throw new Error('preHex is not a string.');
    return this.preHex;
  }

  /**
   * Signs a message using ECDSA. (Mocked)
   * @returns {Buffer} A buffer representing the signature.
   */
  signECDSA() {
    return Buffer.from('', 'utf-8');
  }

  /**
   * Verifies a message signature using ECDSA. (Mocked)
   * @returns {boolean} Always returns true as a mock.
   */
  verifyECDSA() {
    return true;
  }

  /**
   * Returns a vanilla-format public address. (Mocked)
   * @returns {Buffer} An empty buffer as a mock result.
   */
  getPubVanillaAddress() {
    return Buffer.from('', 'utf-8');
  }

  /**
   * Returns the public key in buffer format. (Mocked)
   * @returns {Buffer} An empty buffer as a mock result.
   */
  getPublicKeyBuffer() {
    return Buffer.from('', 'utf-8');
  }

  /**
   * Returns the private key in hexadecimal format. (Mocked)
   * @returns {string} An empty string as mock private key.
   */
  getPrivateKeyHex() {
    return '';
  }

  /**
   * Returns the public key in hexadecimal format.
   * @returns {string} The predefined public key hex.
   */
  getPublicKeyHex() {
    return this.getPreHex();
  }

  /**
   * Returns the public address.
   * @returns {string} The predefined mock address.
   */
  getAddress() {
    return this.getPreAddress();
  }

  /**
   * Converts an address to vanilla format. (Mocked)
   * @returns {Buffer} An empty buffer as mock result.
   */
  addressToVanilla() {
    return Buffer.from('', 'utf-8');
  }

  /**
   * Validates the current address. (Mocked)
   * @returns {ValidationResult} Validation result object with mock values.
   */
  validateAddress() {
    return { valid: true, type: this.getType() };
  }

  /**
   * Recovers the message from a signed hash. (Mocked)
   * @returns {string|null} An empty string as mock recovery.
   */
  recoverMessage() {
    return '';
  }

  /**
   * Signs a plain message using the mock instance. (Mocked)
   * @returns {Buffer} A mock signature as an empty buffer.
   */
  signMessage() {
    return Buffer.from('', 'utf-8');
  }
}

export default TinySecp256k1Mock;
