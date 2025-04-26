import { randomBytes, createDecipheriv, createCipheriv } from 'crypto';
import * as fs from 'fs';
import { Buffer } from 'buffer';
import { objType } from './lib/objFilter.mjs';

/**
 * Determines if the environment is a browser.
 *
 * This constant checks if the code is running in a browser environment by verifying if
 * the `window` object and the `window.document` object are available. It will return `true`
 * if the environment is a browser, and `false` otherwise (e.g., in a Node.js environment).
 *
 * @constant {boolean}
 */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

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
    const plainText = this.#serialize(data);

    const cipher = createCipheriv(this.algorithm, this.key, iv, {
      // @ts-ignore
      authTagLength: this.authTagLength,
    });

    // @ts-ignore
    let encrypted = cipher.update(plainText, this.inputEncoding);
    // @ts-ignore
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      // @ts-ignore
      iv: iv.toString(this.outputEncoding),
      // @ts-ignore
      encrypted: encrypted.toString(this.outputEncoding),
      // @ts-ignore
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
    // @ts-ignore
    let decrypted = decipher.update(encryptedBuffer, null, this.inputEncoding);
    // @ts-ignore
    decrypted += decipher.final(this.inputEncoding);
    const { value, type } = this.#deserialize(decrypted);

    if (expectedType) this.#validateDeserializedType(expectedType, type);
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

    // @ts-ignore
    let decrypted = decipher.update(encryptedBuffer, null, this.inputEncoding);
    // @ts-ignore
    decrypted += decipher.final(this.inputEncoding);

    const { type } = this.#deserialize(decrypted);
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
    if (isBrowser) {
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
    if (isBrowser) {
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
    if (isBrowser) {
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
    if (isBrowser) {
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

  /**
   * A mapping of data types to their serialization functions.
   *
   * This object defines how various JavaScript types should be serialized to a JSON-compatible format.
   * It includes handling for primitive types, complex objects, and non-serializable types such as functions
   * and promises, which throw an error when attempted to be serialized.
   *
   * Each key corresponds to a specific data type (e.g., 'number', 'date', 'buffer', etc.),
   * and the value is a function that serializes the data to a specific format.
   *
   * @type {Record<string, (data: any) => string>}
   * @property {Function} weakmap - Throws an error as WeakMap cannot be serialized.
   * @property {Function} weakset - Throws an error as WeakSet cannot be serialized.
   * @property {Function} promise - Throws an error as Promise cannot be serialized.
   * @property {Function} function - Throws an error as Function cannot be serialized.
   * @property {Function} regexp - Serializes RegExp objects to a JSON object with their string representation.
   * @property {Function} htmlElement - Serializes HTML elements to their outerHTML string.
   * @property {Function} date - Serializes Date objects to an ISO string format.
   * @property {Function} bigint - Serializes BigInt objects to their string representation.
   * @property {Function} number - Serializes numbers to a JSON-compatible format.
   * @property {Function} boolean - Serializes booleans to a JSON-compatible format.
   * @property {Function} string - Serializes strings to a JSON-compatible format.
   * @property {Function} null - Serializes null to a special 'Null' type in JSON.
   * @property {Function} undefined - Serializes undefined to a special 'Undefined' type in JSON.
   * @property {Function} map - Serializes Map objects to an array of entries in JSON format.
   * @property {Function} set - Serializes Set objects to an array of values in JSON format.
   * @property {Function} symbol - Serializes Symbol objects to a JSON object with the symbol's description.
   * @property {Function} array - Serializes arrays to a JSON-compatible format.
   * @property {Function} object - Serializes general objects to a JSON-compatible format.
   * @property {Function} buffer - Serializes Buffer objects to a base64-encoded string.
   */
  #valueConvertTypes = {
    weakmap: () => {
      throw new Error('WeakMap cannot be serialized');
    },
    weakset: () => {
      throw new Error('WeakSet cannot be serialized');
    },
    promise: () => {
      throw new Error('Promise cannot be serialized');
    },
    function: () => {
      throw new Error('Function cannot be serialized');
    },
    regexp: (data) => JSON.stringify({ __type: 'regexp', value: data.toString() }),
    htmlElement: (data) => JSON.stringify({ __type: 'htmlelement', value: data.outerHTML }),
    date: (data) => JSON.stringify({ __type: 'date', value: data.toISOString() }),
    bigint: (data) => JSON.stringify({ __type: 'bigint', value: data.toString() }),
    number: (data) => JSON.stringify({ __type: 'number', value: data }),
    boolean: (data) => JSON.stringify({ __type: 'boolean', value: data }),
    string: (data) => JSON.stringify({ __type: 'string', value: data }),
    null: () => JSON.stringify({ __type: 'null' }),
    undefined: () => JSON.stringify({ __type: 'undefined' }),
    map: (data) =>
      JSON.stringify({
        __type: 'map',
        value: Array.from(data.entries()),
      }),
    set: (data) =>
      JSON.stringify({
        __type: 'set',
        value: Array.from(data.values()),
      }),
    symbol: (data) => JSON.stringify({ __type: 'symbol', value: data.description }),
    array: (data) => JSON.stringify({ __type: 'array', value: data }),
    object: (data) => JSON.stringify({ __type: 'object', value: data }),
    buffer: (data) => JSON.stringify({ __type: 'buffer', value: data.toString('base64') }),
  };

  /**
   * A mapping of data types to their deserialization functions.
   *
   * This object defines how various serialized types should be deserialized back to their original JavaScript objects.
   * It includes support for primitive types, complex objects, and browser-specific types like `HTMLElement`.
   * Each key corresponds to a specific data type (e.g., 'Date', 'BigInt', 'Buffer', etc.),
   * and the value is a function that deserializes the value to its original format.
   *
   * @type {Record<string, (data: any) => any>}
   * @property {Function} regexp - Deserializes a regular expression from its string representation (e.g., `/pattern/flags`).
   * @property {Function} htmlelement - Deserializes an HTML element from its serialized outerHTML string (only works in browser environments).
   * @property {Function} date - Deserializes a date from its ISO string representation.
   * @property {Function} bigint - Deserializes a BigInt from its string representation.
   * @property {Function} number - Deserializes a number from its string or numeric representation.
   * @property {Function} boolean - Deserializes a boolean value from its string representation.
   * @property {Function} null - Deserializes the `null` value.
   * @property {Function} undefined - Deserializes the `undefined` value.
   * @property {Function} map - Deserializes a Map from an array of key-value pairs.
   * @property {Function} set - Deserializes a Set from an array of values.
   * @property {Function} symbol - Deserializes a Symbol from its string description.
   * @property {Function} array - Deserializes an array from its serialized representation.
   * @property {Function} object - Deserializes a plain JSON object from its serialized representation.
   * @property {Function} string - Deserializes a string from its serialized representation.
   * @property {Function} buffer - Deserializes a Buffer from its base64-encoded string representation.
   */
  #valueTypes = {
    regexp: (value) => {
      const match = value.match(/^\/(.*)\/([gimsuy]*)$/);
      return match ? new RegExp(match[1], match[2]) : new RegExp(value);
    },
    htmlelement: (value) => {
      if (typeof document === 'undefined')
        throw new Error('HTMLElement deserialization is only supported in browsers');
      const div = document.createElement('div');
      div.innerHTML = value;
      return div;
    },
    date: (value) => new Date(value),
    bigint: (value) => BigInt(value),
    number: (value) => Number(value),
    boolean: (value) => Boolean(value),
    null: () => null,
    undefined: () => undefined,
    map: (value) => new Map(value),
    set: (value) => new Set(value),
    symbol: (value) => Symbol(value),
    array: (value) => value,
    object: (value) => value,
    string: (value) => String(value),
    buffer: (value) => Buffer.from(value, 'base64'),
  };

  /**
   * Serializes a given data value into a JSON-compatible format based on its type.
   * This method converts various JavaScript data types into their serialized representation
   * that can be encrypted or stored. If the data type is unsupported, an error is thrown.
   *
   * @param {any} data - The data to be serialized.
   * @returns {string} The serialized data in JSON format.
   * @throws {Error} If the data type is unsupported for serialization.
   */
  #serialize(data) {
    const type = objType(data) || 'undefined';
    if (typeof type === 'string' && this.#valueConvertTypes[type])
      return this.#valueConvertTypes[type](data);
    throw new Error(`Unsupported data type for encryption: ${type}`);
  }

  /**
   * Deserializes a string back into its original JavaScript object based on the serialized type information.
   * This method checks the serialized type and converts the string back to its original JavaScript object
   * (such as a `Date`, `Buffer`, `RegExp`, etc.). If the type is unknown or unsupported, it returns the raw value.
   *
   * @param {string} text - The serialized data to be deserialized.
   * @returns {{value: any, type: string}} An object containing the deserialized value and its type.
   * @throws {Error} If deserialization fails due to an invalid or unknown type.
   */
  #deserialize(text) {
    try {
      const parsed = JSON.parse(text);
      const type = parsed.__type;

      if (typeof type !== 'string') return { value: text, type: 'string' };
      if (typeof this.#valueTypes[type] === 'function')
        return {
          value: this.#valueTypes[type](parsed.value),
          type,
        };
      else return { value: text, type: 'Unknown' };
    } catch {
      return { value: text, type: 'Unknown' };
    }
  }

  /**
   * Validates that the actual type of a deserialized value matches the expected type.
   * This method ensures that the type of the deserialized data matches what is expected,
   * throwing an error if there's a mismatch.
   *
   * @param {string} expected - The expected type of the deserialized data.
   * @param {string} actual - The actual type of the deserialized data.
   * @throws {Error} If the types do not match.
   */
  #validateDeserializedType(expected, actual) {
    if (expected !== actual)
      throw new Error(`Type mismatch: expected ${expected}, but got ${actual}`);
  }
}

export default TinyCrypto;
