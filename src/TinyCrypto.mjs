import { randomBytes, createDecipheriv, createCipheriv } from 'crypto';
import * as fs from 'fs';
import { Buffer } from 'buffer';

import { isBrowser } from './lib/os.mjs';
import TinyCryptoParser from './lib/TinyCryptoParser.mjs';

/**
 * TinyCrypto is a utility class that provides methods for secure key generation,
 * encryption, and decryption of data. It also allows for serialization
 * and deserialization of complex data types, and offers methods to save and load encryption
 * configurations and keys from files.
 *
 * @class
 */
class TinyCrypto {
  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser = new TinyCryptoParser();

  /**
   * Indicates whether the serialization or deserialization should be performed deeply.
   * @type {boolean}
   */
  isDeep = true;

  /**
   * Sets the deep serialization and deserialization mode.
   * If the argument is a boolean, updates the deep mode accordingly.
   * Throws an error if the value is not a boolean.
   *
   * @param {boolean} value - A boolean indicating whether deep mode should be enabled.
   * @throws {Error} Throws if the provided value is not a boolean.
   */
  setDeepMode(value) {
    if (typeof value !== 'boolean')
      throw new Error('The value provided to setDeepMode must be a boolean.');

    this.isDeep = value;
  }

  /**
   * Creates a new instance of the CryptoManager class with configurable options.
   *
   * @param {Object} [options={}] - Configuration options for encryption and decryption.
   * @param {string} [options.algorithm='aes-256-gcm'] - The encryption algorithm to use. Recommended: 'aes-256-gcm' for authenticated encryption.
   * @param {BufferEncoding} [options.outputEncoding='hex'] - The encoding used when returning encrypted data (e.g., 'hex', 'base64').
   * @param {BufferEncoding} [options.inputEncoding='utf8'] - The encoding used for plaintext inputs (e.g., 'utf8').
   * @param {number} [options.authTagLength=16] - The length of the authentication tag used in GCM mode. Usually 16 for AES-256-GCM.
   * @param {Buffer} [options.key] - Optional 32-byte cryptographic key. If not provided, a random key is generated.
   *
   * @throws {Error} Throws if the provided key is not 32 bytes long.
   *
   * @example
   * const crypto = new CryptoManager({
   *   algorithm: 'aes-256-gcm',
   *   outputEncoding: 'base64',
   *   key: randomBytes(32),
   * });
   */
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.authTagLength = options.authTagLength || 16;
    this.key = options.key || this.generateKey();
    /** @type {BufferEncoding} */
    this.outputEncoding = options.outputEncoding || 'hex';
    /** @type {BufferEncoding} */
    this.inputEncoding = options.inputEncoding || 'utf8';
  }

  /**
   * Exports the current cryptographic key.
   *
   * @returns {string} The exported key as a hex string.
   */
  getKey() {
    return this.key.toString('hex');
  }

  /**
   * Sets the cryptographic key.
   *
   * This method allows setting a cryptographic key directly. The key should be provided as a string
   * (in hex format) and will be converted to a Buffer for internal use. If the key format is incorrect,
   * an error will be thrown.
   *
   * @param {string} keyHex - The cryptographic key in hex format to be set.
   * @throws {Error} If the provided key is not a valid hex string.
   */
  setKey(keyHex) {
    if (typeof keyHex !== 'string' || !/^[a-fA-F0-9]+$/.test(keyHex))
      throw new Error('Invalid key format. The key must be a valid hex string.');
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Generates a secure random cryptographic key.
   *
   * @param {number} [value=32] - The number of bytes to generate. Default is 32 bytes (256 bits), suitable for AES-256.
   * @returns {Buffer} A securely generated random key as a Buffer.
   *
   * @example
   * const key = cryptoManager.generateKey(); // Generates a 32-byte key
   * const customKey = cryptoManager.generateKey(16); // Generates a 16-byte key (e.g. for AES-128)
   */
  generateKey(value = 32) {
    return randomBytes(value); // 256-bit
  }

  /**
   * Generates a secure random Initialization Vector (IV).
   *
   * @param {number} [value=12] - The number of bytes to generate. Default is 12 bytes (96 bits), the recommended size for AES-GCM.
   * @returns {Buffer} A securely generated IV as a Buffer.
   *
   * @example
   * const iv = cryptoManager.generateIV(); // Generates a 12-byte IV
   * const customIV = cryptoManager.generateIV(16); // Generates a 16-byte IV if needed for other algorithms
   */
  generateIV(value = 12) {
    return randomBytes(value); // 96-bit padrão para GCM
  }

  /**
   * Encrypts a given value (string, number, object, etc.)
   *
   * The value is first serialized de forma segura (preservando o tipo) antes da criptografia.
   *
   * @param {*} data - The data to encrypt. Can be of any supported type (string, number, boolean, Date, JSON, etc.).
   * @param {Buffer} [iv=this.generateIV()] - Optional Initialization Vector (IV). If not provided, a secure random IV is generated.
   * @returns {EncryptedDataParams} An object containing the encrypted data.
   *
   * @example
   * const result = cryptoManager.encrypt('Hello, world!');
   * // {
   * //   iv: 'b32a...',
   * //   encrypted: 'c1d5...',
   * //   authTag: 'aa93...'
   * // }
   */
  encrypt(data, iv = this.generateIV()) {
    const plainText = this.isDeep ? this.#parser.serializeDeep(data) : this.#parser.serialize(data);

    const cipher = createCipheriv(this.algorithm, this.key, iv, {
      // @ts-ignore
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plainText, this.inputEncoding);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString(this.outputEncoding),
      encrypted: encrypted.toString(this.outputEncoding),
      authTag: authTag.toString(this.outputEncoding),
    };
  }

  /**
   * @typedef {Object} EncryptedDataParams
   * @property {string} iv - The Initialization Vector (IV) used in encryption, encoded with the output encoding.
   * @property {string} encrypted - The encrypted data to decrypt, encoded with the output encoding.
   * @property {string} authTag - The authentication tag used to verify the integrity of the encrypted data.
   */

  /**
   * Decrypts a previously encrypted value.
   *
   * The method checks the integrity of the data using the authentication tag (`authTag`) and ensures the data is properly decrypted.
   * After decryption, it automatically deserializes the data back to its original type.
   *
   * @param {EncryptedDataParams} params - An object containing the encrypted data.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {*} The decrypted value, which will be the original type of the data before encryption.
   * @throws {Error} Throws if the authentication tag doesn't match or the data has been tampered with.
   * @throws {Error} Throws if the deserialized value doesn't match the `expectedType`.
   *
   * @example
   * const encryptedData = {
   *   iv: 'b32a...',
   *   encrypted: 'c1d5...',
   *   authTag: 'aa93...'
   * };
   * const decrypted = cryptoManager.decrypt(encryptedData, 'string');
   * console.log(decrypted); // Outputs: 'Hello, world!'
   */
  decrypt({ iv, encrypted, authTag }, expectedType = null) {
    const ivBuffer = Buffer.from(iv, this.outputEncoding);
    const encryptedBuffer = Buffer.from(encrypted, this.outputEncoding);
    const authTagBuffer = Buffer.from(authTag, this.outputEncoding);

    const decipher = createDecipheriv(this.algorithm, this.key, ivBuffer, {
      // @ts-ignore
      authTagLength: this.authTagLength,
    });

    decipher.setAuthTag(authTagBuffer);

    /** @type {string} */
    let decrypted = decipher.update(encryptedBuffer, undefined, this.inputEncoding);
    decrypted += decipher.final(this.inputEncoding);
    const { value } = this.isDeep
      ? this.#parser.deserializeDeep(decrypted, expectedType)
      : this.#parser.deserialize(decrypted, expectedType);
    return value;
  }

  /**
   * Retrieves the type of the original data from an encrypted object.
   *
   * This method decrypts the encrypted data and extracts its type information without fully deserializing the value.
   * It is useful when you need to verify the type of the encrypted data before fully decrypting it.
   *
   * @param {EncryptedDataParams} params - An object containing the encrypted data.
   * @returns {string} The type of the original data (e.g., 'string', 'number', 'date', etc.).
   *
   * @example
   * const encryptedData = {
   *   iv: 'b32a...',
   *   encrypted: 'c1d5...',
   *   authTag: 'aa93...'
   * };
   * const dataType = cryptoManager.getTypeFromEncrypted(encryptedData);
   * console.log(dataType); // Outputs: 'string'
   */
  getTypeFromEncrypted({ iv, encrypted, authTag }) {
    const ivBuffer = Buffer.from(iv, this.outputEncoding);
    const encryptedBuffer = Buffer.from(encrypted, this.outputEncoding);
    const authTagBuffer = Buffer.from(authTag, this.outputEncoding);

    const decipher = createDecipheriv(this.algorithm, this.key, ivBuffer, {
      // @ts-ignore
      authTagLength: this.authTagLength,
    });

    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encryptedBuffer, undefined, this.inputEncoding);
    decrypted += decipher.final(this.inputEncoding);

    const { type } = this.#parser.deserialize(decrypted);
    return typeof type === 'string' ? type : 'unknown';
  }

  /**
   * Saves the cryptographic key to a file.
   *
   * If running in a browser, the method generates a download link for the key as a text file.
   * If running in Node.js, the method saves the key to the specified file path.
   *
   * @param {string} [filename='secret.key'] - The name of the file to save the key. Defaults to 'secret.key'.
   * @throws {Error} Throws an error if the file cannot be written in Node.js.
   *
   * @example
   * // In a browser, triggers a download of the key
   * cryptoManager.saveKeyToFile('myKey.key');
   *
   * // In Node.js, saves the key to 'myKey.key'
   * cryptoManager.saveKeyToFile('myKey.key');
   */
  saveKeyToFile(filename = 'secret.key') {
    const data = this.key.toString('hex');
    if (isBrowser()) {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else fs.writeFileSync(filename, data);
  }

  /**
   * Saves the current cryptographic configuration to a JSON file.
   *
   * If running in a browser, the method generates a download link for the configuration as a JSON file.
   * If running in Node.js, the method saves the configuration to the specified file path.
   *
   * @param {string} [filename='crypto-config.json'] - The name of the file to save the configuration. Defaults to 'crypto-config.json'.
   * @throws {Error} Throws an error if the file cannot be written in Node.js.
   *
   * @example
   * // In a browser, triggers a download of the configuration
   * cryptoManager.saveConfigToFile('myConfig.json');
   *
   * // In Node.js, saves the configuration to 'myConfig.json'
   * cryptoManager.saveConfigToFile('myConfig.json');
   */
  saveConfigToFile(filename = 'crypto-config.json') {
    const configData = JSON.stringify(this.exportConfig(), null, 2);
    if (isBrowser()) {
      const blob = new Blob([configData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else fs.writeFileSync(filename, configData);
  }

  /**
   * Loads and imports cryptographic configuration from a JSON file.
   *
   * If running in a browser, the method allows the user to select a file, reads the file as text,
   * parses the JSON, and imports the configuration.
   * If running in Node.js, the method reads the file synchronously and imports the configuration.
   *
   * @param {File|string} file - The file to load the configuration from. In the browser, this is a `File` object, and in Node.js, it's a file path.
   * @returns {Promise<void>} A promise that resolves when the configuration is successfully loaded and imported.
   * @throws {Error} Throws an error if the JSON file is invalid or the file cannot be read.
   *
   * @example
   * // In a browser, prompt user to select a file and load the configuration
   * cryptoManager.loadConfigFromFile(file)
   *   .then(() => console.log('Config loaded successfully'))
   *   .catch(err => console.error('Error loading config:', err));
   *
   * // In Node.js, load the configuration from a file path
   * cryptoManager.loadConfigFromFile('myConfig.json')
   *   .then(() => console.log('Config loaded successfully'))
   *   .catch(err => console.error('Error loading config:', err));
   */
  async loadConfigFromFile(file) {
    if (isBrowser()) {
      return new Promise((resolve, reject) => {
        if (!(file instanceof File))
          return reject(new Error('In browser, the file must be a File object'));
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const config = typeof reader.result === 'string' ? JSON.parse(reader.result) : {};
            resolve(this.importConfig(config));
          } catch (err) {
            reject(new Error('Invalid config JSON file'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    } else {
      const raw = fs.readFileSync(/** @type {string} */ (file), 'utf8');
      const config = JSON.parse(raw);
      return this.importConfig(config);
    }
  }

  /**
   * Loads a cryptographic key from a file and sets it for encryption/decryption.
   *
   * If running in a browser, the method allows the user to select a file, reads the file as text,
   * and loads the key (in hexadecimal format) into the current instance.
   * If running in Node.js, the method reads the file synchronously, parses the hexadecimal key,
   * and loads it into the current instance.
   *
   * @param {File|string} file - The file to load the key from. In the browser, this is a `File` object, and in Node.js, it's a file path.
   * @returns {Promise<Buffer>} A promise that resolves with the key as a `Buffer` when the file is successfully loaded.
   * @throws {Error} Throws an error if the file cannot be read or if the key is invalid.
   *
   * @example
   * // In a browser, prompt user to select a file and load the key
   * cryptoManager.loadKeyFromFile(file)
   *   .then(key => console.log('Key loaded successfully:', key))
   *   .catch(err => console.error('Error loading key:', err));
   *
   * // In Node.js, load the key from a file path
   * cryptoManager.loadKeyFromFile('myKey.key')
   *   .then(key => console.log('Key loaded successfully:', key))
   *   .catch(err => console.error('Error loading key:', err));
   */
  async loadKeyFromFile(file) {
    if (isBrowser()) {
      return new Promise((resolve, reject) => {
        if (!(file instanceof File))
          return reject(new Error('In browser, the file must be a File object'));
        const reader = new FileReader();
        reader.onload = () => {
          const hexKey = typeof reader.result === 'string' ? reader.result.trim() : '';
          const keyBuffer = Buffer.from(hexKey, 'hex');
          this.key = keyBuffer;
          resolve(keyBuffer);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    } else {
      const hexKey = fs.readFileSync(/** @type {string} */ (file), 'utf8');
      const keyBuffer = Buffer.from(hexKey, 'hex');
      this.key = keyBuffer;
      return keyBuffer;
    }
  }

  /**
   * Exports the current cryptographic configuration as a JSON object.
   *
   * The exported configuration includes the encryption algorithm, output encoding format,
   * input encoding format, the cryptographic key (in hexadecimal format), and the authentication tag length.
   * This method does not include any sensitive data like the raw key, only its hexadecimal representation.
   *
   * @returns {{algorithm: string, outputEncoding: BufferEncoding, inputEncoding: BufferEncoding, key: string, authTagLength: number }} The exported configuration as a plain JavaScript object.
   * @example
   * const config = cryptoManager.exportConfig();
   * console.log(config);
   * // Example output:
   * // {
   * //   algorithm: 'aes-256-gcm',
   * //   outputEncoding: 'hex',
   * //   inputEncoding: 'utf8',
   * //   key: 'abcdef1234567890...',
   * //   authTagLength: 16
   * // }
   */
  exportConfig() {
    return {
      algorithm: this.algorithm,
      outputEncoding: this.outputEncoding,
      inputEncoding: this.inputEncoding,
      key: this.key.toString('hex'),
      authTagLength: this.authTagLength,
    };
  }

  /**
   * Imports a cryptographic configuration from a JSON object.
   *
   * This method sets the configuration for the encryption process, including the algorithm, encoding formats,
   * authentication tag length, and the cryptographic key (in hexadecimal string format).
   * If any of the expected properties are missing or invalid, an error will be thrown.
   *
   * @param {Object} config - The configuration object to import.
   * @param {string} config.algorithm - The encryption algorithm (e.g., 'aes-256-gcm').
   * @param {BufferEncoding} config.outputEncoding - The output encoding format (e.g., 'hex').
   * @param {BufferEncoding} config.inputEncoding - The input encoding format (e.g., 'utf8').
   * @param {number} config.authTagLength - The authentication tag length (e.g., 16).
   * @param {string} config.key - The cryptographic key in hexadecimal string format.
   *
   * @throws {Error} If any required property is missing or has an invalid type.
   * @example
   * const config = {
   *   algorithm: 'aes-256-gcm',
   *   outputEncoding: 'hex',
   *   inputEncoding: 'utf8',
   *   authTagLength: 16,
   *   key: 'abcdef1234567890abcdef1234567890',
   * };
   * cryptoManager.importConfig(config);
   */
  importConfig(config) {
    if (typeof config.algorithm === 'string') this.algorithm = config.algorithm;
    else if (typeof config.algorithm !== 'undefined')
      throw new Error('Invalid or missing "algorithm" property. Expected a string.');

    if (typeof config.outputEncoding === 'string') this.outputEncoding = config.outputEncoding;
    else if (typeof config.outputEncoding !== 'undefined')
      throw new Error('Invalid or missing "outputEncoding" property. Expected a string.');

    if (typeof config.inputEncoding === 'string') this.inputEncoding = config.inputEncoding;
    else if (typeof config.inputEncoding !== 'undefined')
      throw new Error('Invalid or missing "inputEncoding" property. Expected a string.');

    if (typeof config.authTagLength === 'number') this.authTagLength = config.authTagLength;
    else if (typeof config.authTagLength !== 'undefined')
      throw new Error('Invalid or missing "authTagLength" property. Expected a number.');

    if (typeof config.key === 'string') this.key = Buffer.from(config.key, 'hex');
    else if (typeof config.key !== 'undefined')
      throw new Error('Invalid or missing "key" property. Expected a hexadecimal string.');
  }
}

export default TinyCrypto;
