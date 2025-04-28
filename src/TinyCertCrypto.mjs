import * as fs from 'fs';
import { Buffer } from 'buffer';
import clone from 'clone';
import { isBrowser } from './lib/os.mjs';
import TinyCrypto from './TinyCrypto.mjs';

/**
 * Class representing a certificate and key management utility.
 *
 * This class provides functionality to load, initialize, and manage X.509 certificates and RSA keys.
 * It supports encryption and decryption operations using RSA keys, and also includes utility methods
 * for certificate handling and metadata extraction.
 *
 * @class
 */
class TinyCertCrypto {
  /** @typedef {import('node-forge')} NodeForge */
  /** @typedef {import('node-forge').pki.Certificate} Certificate */
  /** @typedef {import('node-forge').pki.CertificateField} CertificateField */
  /** @typedef {import('node-forge').pki.rsa.PublicKey} PublicKey */
  /** @typedef {import('node-forge').pki.rsa.PrivateKey} PrivateKey */
  /** @typedef {import('node-forge').pki.rsa.EncryptionScheme} EncryptionScheme */
  /** @typedef {import('node-forge').pki.PEM} PEM */
  /** @typedef {Record<string|number, any>|any[]} CryptoResult */
  /** @typedef {string} Base64 */

  /** @type {PublicKey|null} */ publicKey = null;
  /** @type {PrivateKey|null} */ privateKey = null;
  /** @type {Certificate|null} */ publicCert = null;
  /** @type {Record<string, any>|null} */ metadata = null;
  /** @type {string|null} */ source = null;
  /** @type {TinyCrypto|null} */ #tinyCrypto = null;

  /**
   * Regular expression for matching X.509 PEM certificates.
   *
   * This pattern captures the base64-encoded body of a certificate
   * enclosed between `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`.
   * It supports multi-line content.
   *
   * @type {RegExp}
   */
  #certRegex = /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/;

  /**
   * Regular expression for matching RSA PEM keys.
   *
   * This pattern captures both RSA public and private keys, supporting
   * the standard PEM formatting:
   * `-----BEGIN [RSA] PUBLIC|PRIVATE KEY-----` to `-----END ... KEY-----`.
   * It captures the key type (PUBLIC|PRIVATE) and the base64 content.
   *
   * @type {RegExp}
   */
  #keyRegex =
    /-----BEGIN\s+(?:RSA\s+)?(PUBLIC|PRIVATE)\s+KEY-----([\s\S]+?)-----END\s+(?:RSA\s+)?\1\s+KEY-----/;

  /**
   * Constructs a new instance of TinyCertCrypto.
   *
   * This class provides cross-platform (Node.js and browser) support
   * for handling X.509 certificates and performing RSA-based encryption and decryption.
   *
   * The constructor accepts optional paths or PEM buffers for the public certificate and private key.
   * If used in a browser environment, either `publicCertPath` or `publicCertBuffer` is required.
   *
   * @param {Object} [options={}] - Initialization options.
   * @param {string|null} [options.publicCertPath=null] - Path or URL to the public certificate in PEM format.
   * @param {string|null} [options.privateKeyPath=null] - Path or URL to the private key in PEM format.
   * @param {string|Buffer|null} [options.publicCertBuffer=null] - The public certificate as a PEM string or Buffer.
   * @param {string|Buffer|null} [options.privateKeyBuffer=null] - The private key as a PEM string or Buffer.
   * @param {EncryptionScheme} [options.cryptoType='RSA-OAEP'] - The algorithm identifier used with Crypto API.
   *
   * @throws {Error} If in a browser and neither `publicCertPath` nor `publicCertBuffer` is provided.
   * @throws {Error} If provided buffers are not strings or Buffers.
   */
  constructor({
    publicCertPath = null,
    privateKeyPath = null,
    publicCertBuffer = null,
    privateKeyBuffer = null,
    cryptoType = 'RSA-OAEP',
  } = {}) {
    if (
      publicCertBuffer &&
      typeof publicCertBuffer !== 'string' &&
      !Buffer.isBuffer(publicCertBuffer)
    )
      throw new Error('publicCertBuffer must be a string or Buffer');

    if (
      privateKeyBuffer &&
      typeof privateKeyBuffer !== 'string' &&
      !Buffer.isBuffer(privateKeyBuffer)
    )
      throw new Error('privateKeyBuffer must be a string or Buffer');

    this.cryptoType = cryptoType;
    this.publicCertPath = publicCertPath;
    this.privateKeyPath = privateKeyPath;
    this.publicCertBuffer = publicCertBuffer;
    this.privateKeyBuffer = privateKeyBuffer;
  }

  /**
   * Starts the internal TinyCrypto instance.
   * If an internal TinyCrypto instance is already set, an error will be thrown to prevent overriding it.
   *
   * @param {TinyCrypto} [tinyCrypto] - The TinyCrypto instance to be set.
   * @throws {Error} Throws if TinyCrypto instance has already been set.
   */
  startCrypto(tinyCrypto) {
    if (this.#tinyCrypto) throw new Error('TinyCrypto instance is already set.');
    if (typeof tinyCrypto === 'undefined') this.#tinyCrypto = new TinyCrypto();
    else this.#tinyCrypto = tinyCrypto;
  }

  /**
   * Returns the previously loaded TinyCrypto instance.
   * Assumes the module has already been loaded.
   *
   * @returns {TinyCrypto} The TinyCrypto module.
   */
  getCrypto() {
    if (typeof this.#tinyCrypto === 'undefined' || this.#tinyCrypto === null)
      throw new Error(
        `Failed to get TinyCrypto: Module is ${this.#tinyCrypto !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure to use this.startCrypto().',
      );
    return this.#tinyCrypto;
  }

  /**
   * Checks if the TinyCrypto instance exists.
   *
   * This method returns `true` if the TinyCrypto module has been set and is not null,
   * otherwise returns `false`.
   *
   * @returns {boolean} Whether the TinyCrypto module exists.
   */
  existsCrypto() {
    return typeof this.#tinyCrypto !== 'undefined' && this.#tinyCrypto !== null ? true : false;
  }

  /**
   * Add a new value type and its converter function.
   * @param {string} typeName
   * @param {(data: any) => any} getFunction
   * @param {(data: any) => { __type: string, value?: any }} convertFunction
   */
  addValueType(typeName, getFunction, convertFunction) {
    return this.getCrypto().addValueType(typeName, getFunction, convertFunction);
  }

  /**
   * Sets the deep serialization and deserialization mode in the TinyCrypto instance.
   * If the argument is a boolean, updates the deep mode accordingly.
   * Throws an error if the value is not a boolean.
   *
   * @param {boolean} value - A boolean indicating whether deep mode should be enabled.
   * @throws {Error} Throws if the provided value is not a boolean.
   */
  setDeepMode(value) {
    const tinyCrypto = this.getCrypto();
    return tinyCrypto.setDeepMode(value);
  }

  /**
   * Dynamically imports the `node-forge` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * This method is private and should not be called directly from outside.
   *
   * @returns {Promise<NodeForge>} The loaded `node-forge` module.
   */
  async #fetchNodeForge() {
    if (!this.forge) {
      const forge = await import(/* webpackMode: "eager" */ 'node-forge').catch(() => {
        console.warn(
          '[TinyCertCrypto] Warning: "node-forge" is not installed. ' +
            'TinyCertCrypto requires "node-forge" to function properly. ' +
            'Please install it with "npm install node-forge" if you intend to use certificate-related features.',
        );
        return null;
      });
      if (forge) {
        // @ts-ignore
        this.forge = forge?.default ?? forge;
      }
    }
    return this.#getNodeForge();
  }

  /**
   * Public wrapper for fetching the `node-forge` module.
   * Useful for on-demand loading in environments like browsers.
   *
   * @returns {Promise<NodeForge>} The loaded `node-forge` module.
   */
  async fetchNodeForge() {
    return this.#fetchNodeForge();
  }

  /**
   * Returns the previously loaded `node-forge` instance.
   * Assumes the module has already been loaded.
   *
   * @returns {NodeForge} The `node-forge` module.
   */
  #getNodeForge() {
    if (typeof this.forge === 'undefined' || this.forge === null)
      throw new Error(
        `Failed to initialize Forge: Module is ${this.forge !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "node-forge" is installed.\n' +
          'You can install it by running: npm install node-forge',
      );
    return this.forge;
  }

  /**
   * Public wrapper for accessing the `node-forge` instance.
   *
   * @returns {NodeForge} The `node-forge` module.
   */
  getNodeForge() {
    return this.#getNodeForge();
  }

  /**
   * Detects the type of a PEM-formatted string.
   *
   * Recognizes X.509 certificates and RSA keys (public/private).
   * Returns a string describing the type, such as `'certificate'`, `'public_key'`, `'private_key'`,
   * or `'unknown'` if the format is not recognized.
   *
   * @param {string} pemString - The PEM string to inspect.
   * @returns {string} The detected PEM type.
   */
  #detectPemType(pemString) {
    if (this.#certRegex.test(pemString)) return 'certificate';
    const keyMatch = this.#keyRegex.exec(pemString);
    if (keyMatch && typeof keyMatch[1] === 'string') return keyMatch[1].toLowerCase() + '_key'; // "public_key" or "private_key"
    return 'unknown';
  }

  /**
   * Generates a new X.509 certificate along with a public/private RSA key pair.
   *
   * This method can only be used in Node.js environments. It throws an error if a certificate
   * or key is already loaded into the instance.
   *
   * @param {Object<string, string>} subjectFields - An object representing the subject fields of the certificate (e.g., CN, O, C).
   * @param {Object} [options={}] - Optional configuration for key and certificate generation.
   * @param {number} [options.modulusLength=2048] - Length of the RSA key in bits.
   * @param {number} [options.validityInYears=1] - Number of years the certificate will be valid.
   * @param {number} [options.randomBytesLength=16] - Number of random bytes to use for serial number generation.
   *
   * @returns {Promise<{publicKey: string, privateKey: string, cert: string}>} The generated keys and certificate in PEM format.
   * @throws {Error} If running in a browser or if a cert/key is already loaded.
   */
  async generateX509Cert(subjectFields, options = {}) {
    // Errors
    if (this.publicKey || this.privateKey || this.publicCert)
      throw new Error('A certificate is already loaded into the instance.');

    // Prepare cert
    const { pki } = await this.#fetchNodeForge();

    /**
     * @property {number} [modulusLength=2048] - The length of the RSA modulus (in bits). Default is 2048.
     * @property {number} [validityInYears=1] - The validity period of the key pair in years. Default is 1 year.
     * @property {number} [randomBytesLength=16] - The length of random bytes used in key generation. Default is 16 bytes.
     */
    const { modulusLength = 2048, validityInYears = 1, randomBytesLength = 16 } = options;

    // Generate keys
    const { publicKey, privateKey } = pki.rsa.generateKeyPair(modulusLength);
    const encodedPublicKey = pki.publicKeyToPem(publicKey);
    const encodedPrivateKey = pki.privateKeyToPem(privateKey);

    // Get pem files
    const { cert, publicPem, privatePem } = this.#generateCertificate(
      subjectFields,
      encodedPublicKey,
      encodedPrivateKey,
      validityInYears,
      randomBytesLength,
    );

    // Insert data
    this.publicKey = publicPem;
    this.privateKey = privatePem;

    this.publicCertPath = 'MEMORY';
    this.privateKeyPath = 'MEMORY';
    this.source = 'memory';
    this.publicCertBuffer = Buffer.from(encodedPublicKey);
    this.privateKeyBuffer = Buffer.from(encodedPrivateKey);

    this.#loadX509Certificate(cert);
    return { publicKey: encodedPublicKey, privateKey: encodedPrivateKey, cert };
  }

  /**
   * @typedef {Object} CertificateDetails
   * @property {PEM} cert - The certificate in PEM format.
   * @property {PublicKey} publicPem - The public key in PEM format.
   * @property {PrivateKey} privatePem - The private key in PEM format.
   */

  /**
   * Generates a self-signed X.509 certificate using the given public and private RSA keys.
   *
   * This method creates a certificate, assigns the subject and issuer fields,
   * sets the validity period, and signs it with the private key.
   *
   * @param {Object<string, string>} subject - An object representing the subject/issuer fields (e.g., { CN: 'example.com' }).
   * @param {string} publicKey - The public key in PEM format.
   * @param {string} privateKey - The private key in PEM format.
   * @param {number} validityInYears - Number of years the certificate will remain valid.
   * @param {number} randomBytesLength - Number of random bytes used to generate the serial number.
   *
   * @returns {CertificateDetails} An object containing:
   *   - {string} cert: The generated certificate in PEM format.
   *   - {Object} publicPem: The parsed public key object (from node-forge).
   *   - {Object} privatePem: The parsed private key object (from node-forge).
   */
  #generateCertificate(subject, publicKey, privateKey, validityInYears, randomBytesLength) {
    const { pki, random } = this.#getNodeForge();
    const cert = pki.createCertificate();
    const publicPem = pki.publicKeyFromPem(publicKey);
    const privatePem = pki.privateKeyFromPem(privateKey);

    if (typeof publicPem !== 'object') throw new Error('Public pem must be a publicPem.');
    if (typeof privatePem !== 'object') throw new Error('Private pem must be a privatePem.');

    cert.publicKey = publicPem;
    cert.serialNumber = Buffer.from(random.getBytesSync(randomBytesLength)).toString('hex');
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + validityInYears);

    const attrs = [];
    for (const name in subject) attrs.push({ name, value: subject[name] });

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(privatePem);
    return { cert: pki.certificateToPem(cert), publicPem, privatePem };
  }

  /**
   * Initializes the instance by loading the public certificate and, optionally, the private key.
   *
   * This method must be called before using cryptographic operations that depend on a loaded certificate.
   * It supports both Node.js and browser environments.
   *
   * In Node.js:
   * - It loads PEM data from provided file paths or buffers.
   *
   * In browsers:
   * - It loads PEM data from provided URLs or ArrayBuffers.
   *
   * @async
   * @throws {Error} If a certificate is already loaded.
   * @throws {Error} If no public certificate is provided.
   * @throws {Error} If the PEM type cannot be determined or is invalid.
   */
  async init() {
    // Errors
    if (this.publicKey || this.privateKey || this.publicCert)
      throw new Error('A certificate is already loaded into the instance.');

    if (!this.publicCertPath && !this.publicCertBuffer)
      throw new Error('Public certificate is required to initialize');

    // Load public key
    this.metadata = {};
    const { pki } = await this.#fetchNodeForge();

    /**
     * Loads the public key from a PEM-encoded certificate or public key.
     *
     * @param {string|null} publicPem - The PEM-encoded public key or certificate.
     * @throws {Error} If the PEM string is not recognized or if the key cannot be parsed.
     */
    const loadPublicKey = (publicPem) => {
      if (typeof publicPem !== 'string')
        throw new Error(
          'Expected publicPem to be a string containing a PEM-encoded key or certificate.',
        );

      // File type
      const fileType = this.#detectPemType(publicPem);

      // Cert
      if (fileType === 'certificate') {
        const cert = pki.certificateFromPem(publicPem);
        // @ts-ignore
        this.publicKey = cert.publicKey;
        this.#loadX509Certificate(cert);
      }

      // Public key
      else if (fileType === 'public_key') this.publicKey = pki.publicKeyFromPem(publicPem);
      else throw new Error('Public key is required to initialize');
    };

    /**
     * Loads the private key from a PEM-encoded private key.
     *
     * @param {string|null} privatePem - The PEM-encoded private key.
     * @throws {Error} If the PEM string is not recognized or if the key cannot be parsed.
     */
    const loadPrivateKey = (privatePem) => {
      if (typeof privatePem !== 'string')
        throw new Error('Expected privatePem to be a string containing a PEM-encoded private key.');
      const fileType = this.#detectPemType(privatePem);
      if (fileType === 'private_key') this.privateKey = pki.privateKeyFromPem(privatePem);
      else throw new Error('Private key is required to initialize');
    };

    if (typeof this.publicCertPath !== 'string')
      throw new Error(
        `Expected 'publicCertPath' to be a string, but got ${typeof this.publicCertPath}`,
      );
    if (typeof this.privateKeyPath !== 'string')
      throw new Error(
        `Expected 'privateKeyPath' to be a string, but got ${typeof this.privateKeyPath}`,
      );

    // Nodejs
    if (!isBrowser()) {
      const usedPublicBuffer = !!this.publicCertBuffer;
      const usedPrivateBuffer = !!this.privateKeyBuffer;

      // Public key
      const publicPem = usedPublicBuffer
        ? typeof this.publicCertBuffer === 'string'
          ? this.publicCertBuffer
          : Buffer.isBuffer(this.publicCertBuffer)
            ? this.publicCertBuffer.toString('utf-8')
            : null
        : fs.readFileSync(this.publicCertPath, 'utf-8');
      loadPublicKey(publicPem);

      // Private Key
      if (this.privateKeyPath || this.privateKeyBuffer) {
        const privatePem = usedPrivateBuffer
          ? typeof this.privateKeyBuffer === 'string'
            ? this.privateKeyBuffer
            : Buffer.isBuffer(this.privateKeyBuffer)
              ? this.privateKeyBuffer.toString('utf-8')
              : null
          : fs.readFileSync(this.privateKeyPath, 'utf-8');

        loadPrivateKey(privatePem);
      }

      // Insert source
      this.source = this.publicCertBuffer || this.privateKeyBuffer ? 'memory' : 'file';
    }

    // Browser
    else {
      // Public key
      const publicPem = this.publicCertBuffer
        ? typeof this.publicCertBuffer === 'string'
          ? this.publicCertBuffer
          : new TextDecoder().decode(this.publicCertBuffer)
        : await fetch(this.publicCertPath).then((r) => r.text());
      loadPublicKey(publicPem);

      // Private key
      if (this.privateKeyPath || this.privateKeyBuffer) {
        const privatePem = this.privateKeyBuffer
          ? typeof this.privateKeyBuffer === 'string'
            ? this.privateKeyBuffer
            : new TextDecoder().decode(this.privateKeyBuffer)
          : await fetch(this.privateKeyPath).then((r) => r.text());
        loadPrivateKey(privatePem);
      }

      // Insert key
      this.source = 'url';
    }
  }

  /**
   * Parses and stores an X.509 certificate in the instance, extracting metadata such as
   * subject, issuer, serial number, and validity period.
   *
   * This method supports both PEM strings and already-parsed Forge certificate objects.
   * The parsed certificate is saved to `this.publicCert` and its metadata is extracted to `this.metadata`.
   *
   * @param {string|Certificate} certPem - A PEM-encoded certificate string or a `forge.pki.Certificate` object.
   * @throws {Error} If the certificate cannot be parsed or processed.
   */
  #loadX509Certificate(certPem) {
    const { pki } = this.#getNodeForge();
    try {
      const cert = typeof certPem === 'string' ? pki.certificateFromPem(certPem) : certPem;
      this.publicCert = cert;

      /**
       * @param {Array<CertificateField>} attributes - The list of attributes, each containing `name`, `shortName`, and `value`.
       * @returns {{names: { [key: string]: string }, shortNames: { [key: string]: string }, raw: string}} The processed data containing the organized attributes.
       */
      const insertData = (attributes) => {
        /** @type {{[key: string]: string}} */
        const names = {};
        /** @type {{[key: string]: string}} */
        const shortNames = {};
        const raw = attributes
          .filter((attr) => typeof attr.shortName === 'string' && typeof attr.value === 'string')
          .map((attr) => `${attr.shortName}=${attr.value}`)
          .join(',');
        for (const item of attributes) {
          if (typeof item.name === 'string' && typeof item.value === 'string')
            names[item.name] = item.value;
          if (typeof item.shortName === 'string' && typeof item.value === 'string')
            shortNames[item.shortName] = item.value;
        }
        return { names, shortNames, raw };
      };

      this.metadata = {
        subject: insertData(cert.subject.attributes),
        issuer: insertData(cert.issuer.attributes),
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
      };
    } catch (err) {
      throw new Error(
        `Failed to parse X.509 certificate in browser: ${err instanceof Error && typeof err.message === 'string' ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extracts the metadata of the loaded X.509 certificate.
   *
   * Returns an object containing the certificate's metadata such as the subject, issuer,
   * serial number, and validity period. If no certificate is loaded, an empty object is returned.
   *
   * @returns {Record<string, any>} The metadata of the certificate, or an empty object if no certificate is loaded.
   */
  extractCertMetadata() {
    return this.metadata ? clone(this.metadata) : {};
  }

  /**
   * @param {string} data - The JSON object to be encrypted.
   * @returns {Base64} The encrypted JSON object, encoded in Base64 format.
   * @throws {Error} If the public key is not initialized (i.e., if `init()` or `generateKeyPair()` has not been called).
   */
  #encrypt(data) {
    const forge = this.#getNodeForge();
    if (!this.publicKey)
      throw new Error('Public key is not initialized. Call init() or generateKeyPair() first.');
    const encrypted = this.publicKey.encrypt(data, this.cryptoType);
    return forge.util.encode64(encrypted);
  }

  /**
   * @param {Base64} encryptedBase64 - The encrypted JSON string in Base64 format to be decrypted.
   * @returns {*} The decrypted JSON object.
   * @throws {Error} If the private key is not initialized.
   */
  #decrypt(encryptedBase64) {
    const forge = this.#getNodeForge();
    if (!this.privateKey) throw new Error('Private key is required for decryption');
    const data = forge.util.decode64(encryptedBase64);
    const decrypted = this.privateKey.decrypt(data, this.cryptoType);
    return decrypted;
  }

  /**
   * Encrypts a JSON object using the initialized public key.
   *
   * This method serializes the provided JSON object to a string and encrypts it using the
   * public key in PEM format. The encryption is done using the algorithm defined in the
   * `cryptoType` property (e.g., 'RSA-OAEP').
   *
   * @param {CryptoResult} jsonObject - The JSON object to be encrypted.
   * @returns {Base64} The encrypted JSON object, encoded in Base64 format.
   * @throws {Error} If the public key is not initialized (i.e., if `init()` or `generateKeyPair()` has not been called).
   */
  encryptJson(jsonObject) {
    return this.#encrypt(JSON.stringify(jsonObject));
  }

  /**
   * Decrypts a Base64-encoded encrypted JSON string using the initialized private key.
   *
   * This method takes the encrypted Base64 string, decodes it, and decrypts it using the
   * private key in PEM format. It then parses the decrypted string back into a JSON object.
   *
   * @param {Base64} encryptedBase64 - The encrypted JSON string in Base64 format to be decrypted.
   * @returns {CryptoResult} The decrypted JSON object.
   * @throws {Error} If the private key is not initialized.
   */
  decryptToJson(encryptedBase64) {
    return JSON.parse(this.#decrypt(encryptedBase64));
  }

  /**
   * @typedef {Object} EncryptedDataParamsNoKeys
   * @property {Base64} auth - The Initialization Vector (IV) encrypted by the TinyCertCrypto used in encryption, encoded with the output encoding.
   * @property {string} encrypted - The encrypted data to decrypt, encoded with the output encoding.
   */

  /**
   * @typedef {Object} EncryptedDataParams
   * @property {Base64} auth - The Initialization Vector (IV) encrypted by the TinyCertCrypto used in encryption, encoded with the output encoding.
   * @property {string} iv - The Initialization Vector (IV) used in encryption, encoded with the output encoding.
   * @property {string} encrypted - The encrypted data to decrypt, encoded with the output encoding.
   * @property {string} authTag - The authentication tag used to verify the integrity of the encrypted data.
   */

  /**
   * Encrypts a value using the initialized public key.
   *
   * This method serializes the provided value to a string and encrypts it using the
   * public key in PEM format. The encryption is done using the algorithm defined in the
   * `cryptoType` property (e.g., 'RSA-OAEP').
   *
   * @param {*} data - The value to be encrypted.
   * @returns {EncryptedDataParams} The encrypted value, encoded in Base64 format.
   * @throws {Error} If the public key is not initialized (i.e., if `init()` or `generateKeyPair()` has not been called).
   */
  encrypt(data) {
    const tinyCrypto = this.getCrypto();
    const { iv, encrypted, authTag } = tinyCrypto.encrypt(data);
    const auth = this.#encrypt(tinyCrypto.getKey());
    return { auth, iv, authTag, encrypted };
  }

  /**
   * Decrypts a Base64-encoded encrypted value using the initialized private key.
   *
   * This method takes the encrypted Base64 string, decodes it, and decrypts it using the
   * private key in PEM format. It then parses the decrypted string back into a value.
   *
   * @param {EncryptedDataParams} params - The encrypted value in Base64 format to be decrypted.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {*} The decrypted value.
   * @throws {Error} If the private key is not initialized.
   */
  decrypt({ auth, iv, authTag, encrypted }, expectedType = null) {
    const tinyCrypto = this.getCrypto();
    const hexKey = this.#decrypt(auth);
    tinyCrypto.setKey(hexKey);
    return tinyCrypto.decrypt({ iv, encrypted, authTag }, expectedType);
  }

  /**
   * Encrypts a value using the initialized public key.
   *
   * This method serializes the provided value to a string and encrypts it using the
   * public key in PEM format. The encryption is done using the algorithm defined in the
   * `cryptoType` property (e.g., 'RSA-OAEP').
   *
   * @param {*} data - The value to be encrypted.
   * @returns {EncryptedDataParamsNoKeys} The encrypted value, encoded in Base64 format.
   * @throws {Error} If the public key is not initialized (i.e., if `init()` or `generateKeyPair()` has not been called).
   */
  encryptWithoutKey(data) {
    const tinyCrypto = this.getCrypto();
    const { iv, encrypted, authTag } = tinyCrypto.encrypt(data);
    const auth = this.#encrypt(JSON.stringify({ iv, authTag }));
    return { auth, encrypted };
  }

  /**
   * Decrypts a Base64-encoded encrypted value using the initialized private key.
   *
   * This method takes the encrypted Base64 string, decodes it, and decrypts it using the
   * private key in PEM format. It then parses the decrypted string back into a value.
   *
   * @param {EncryptedDataParamsNoKeys} params - The encrypted value in Base64 format to be decrypted.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {*} The decrypted value.
   * @throws {Error} If the private key is not initialized.
   */
  decryptWithoutKey({ auth, encrypted }, expectedType = null) {
    const tinyCrypto = this.getCrypto();
    const { iv, authTag } = JSON.parse(this.#decrypt(auth));
    return tinyCrypto.decrypt({ iv, encrypted, authTag }, expectedType);
  }

  /**
   * Checks if both the public and private keys are initialized.
   *
   * This method verifies if both the public key and private key have been initialized
   * in the instance. It returns `true` if both keys are present, otherwise `false`.
   *
   * @returns {boolean} `true` if both public and private keys are initialized, `false` otherwise.
   */
  hasKeys() {
    return this.publicKey !== null && this.privateKey !== null;
  }

  /**
   * Checks if a public certificate is initialized.
   *
   * This method checks if the public certificate has been loaded or initialized in the instance.
   * It returns `true` if the public certificate is available, otherwise `false`.
   *
   * @returns {boolean} `true` if the public certificate is initialized, `false` otherwise.
   */
  hasCert() {
    return this.publicCert !== null;
  }

  /**
   * Resets the instance by clearing the keys and certificate data.
   *
   * This method sets the public and private keys, the public certificate, metadata, and
   * the source to `null`, effectively resetting the instance to its initial state.
   */
  reset() {
    this.publicKey = null;
    this.privateKey = null;
    this.publicCert = null;
    this.metadata = null;
    this.source = null;
  }
}

export default TinyCertCrypto;
