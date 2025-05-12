import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';
import TinySecp256k1 from './Secp256k1/index.mjs';

/**
 * @typedef {Object} NewTransaction
 * @property {string} from - The sender's address
 * @property {string} to - The recipient's address
 * @property {string | number | bigint} amount - The amount of the transaction
 */

/**
 * @typedef {Object} Transaction
 * @property {string} from - The sender's address
 * @property {string} to - The recipient's address
 * @property {bigint} amount - The amount of the transaction
 */

/**
 * @typedef {Object} NewTransactionData
 * @property {bigint | number | string} gasLimit - Max gas allowed for transactions.
 * @property {bigint | number | string} gasUsed - Actual gas used.
 * @property {bigint | number | string} maxPriorityFeePerGas - Priority fee paid to the miner.
 * @property {bigint | number | string} maxFeePerGas - Max total fee per gas unit allowed.
 * @property {string} address - Hex address that created the tx.
 * @property {string} addressType - Address type that created the tx.
 * @property {*} payload - Payload content (usually a string).
 * @property {Array<NewTransaction>} [transfers] - Transfer list.
 */

/**
 * @typedef {Object} TransactionData
 * @property {bigint} gasLimit - Max gas allowed for transactions.
 * @property {bigint} gasUsed - Actual gas used.
 * @property {bigint} maxPriorityFeePerGas - Priority fee paid to the miner.
 * @property {bigint} maxFeePerGas - Max total fee per gas unit allowed.
 * @property {string} address - Hex address that created the block.
 * @property {string} addressType - Address type that created the block.
 * @property {*} payload - Payload content (usually a string).
 * @property {Array<NewTransaction>} transfers - Transfer list.
 */

/**
 * Creates a new instance of a block with all necessary data and gas configuration.
 *
 * @typedef {Object} BlockInitData - Configuration object.
 * @property {boolean} [firstValidation=true] - The first validation of the block must be performed.
 * @property {boolean} [payloadString=true] - If true, payload must be a string.
 * @property {TinySecp256k1} [signer] - Signer instance for cryptographic operations.
 * @property {TinyCryptoParser} [parser] - Parser instance used for deep serialization.
 * @property {bigint | number | string} [index=0n] - Block index.
 * @property {string} [options.prevHash=''] - Hash of the previous block.
 * @property {bigint | number | string} [diff=1n] - Mining difficulty.
 * @property {bigint | number | string} [reward=0n] - Block reward.
 * @property {bigint | number | string} [nonce=0n] - Starting nonce.
 * @property {bigint | number | string} [chainId] - The chain ID.
 * @property {bigint | number | string} [baseFeePerGas] - Base fee per gas unit.
 * @property {TxIndexMap} [txs] - A map where each key is a transaction index.
 * @property {SignIndexMap} [sigs] - A map where each key is a transaction signature.
 * @property {number} [time=Date.now()] - Unix timestamp of the block.
 * @property {string|null} [hash=null] - Optional precomputed hash.
 * @property {string|null} [miner=null] - Address of the miner.
 * @property {NewTransactionData[]} [data=[]] - Block data.
 */
/**
 * @typedef {{
 *   index: bigint,
 *   time: number,
 *   data: TransactionData[],
 *   prevHash: string|null,
 *   diff: bigint,
 *   nonce: bigint,
 *   hash: string,
 *   reward: bigint,
 *   miner: string|null,
 *   chainId: bigint,
 *   baseFeePerGas: bigint,
 *   txs: TxIndexMap,
 *   sigs: SignIndexMap,
 * }} GetTransactionData
 */

/**
 * @typedef {Record.<string, number>} TxIndexMap
 * A map where each key is a transaction index and the value is the transaction ID.
 */

/**
 * @typedef {Array<string>} SignIndexMap
 * A map where each key is a transaction index and the value is the signature in hex.
 */

/**
 * Represents a single block within the TinyDataChain structure.
 *
 * A block stores a list of transaction data, gas metrics, and
 * metadata used for validation and mining. It includes fields
 * such as index, timestamp, nonce, miner address, and cryptographic
 * hashes. It is designed to be immutable after mining and stores
 * calculated fees used to incentivize miners.
 *
 * This class assumes values like `index`, `prevHash`, and `minerAddress`
 * are externally controlled and trusted when mining or constructing blocks.
 *
 * @class
 */
class TinyChainBlock {
  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser;

  /**
   * The signer instance used for cryptographic operations.
   * @type {TinySecp256k1}
   */
  #signer;

  #payloadString = false;
  #stopRequested = false;

  /**
   * Validates and sanitizes the list of transfers.
   * @param {Array<NewTransaction>|undefined} transfers
   * @returns {Array<Transaction>}
   * @throws {Error} If any transfer is invalid or has invalid types.
   */
  #transferValidator(transfers) {
    if (!Array.isArray(transfers)) throw new Error('Transfers must be an array or undefined.');
    return transfers.map((t, index) => {
      if (typeof t !== 'object' || t === null)
        throw new Error(`Transfer at index ${index} is not a valid object.`);
      if (typeof t.from !== 'string')
        throw new Error(`"from" in transfer at index ${index} must be a string.`);
      if (typeof t.to !== 'string')
        throw new Error(`"to" in transfer at index ${index} must be a string.`);
      if (
        typeof t.amount !== 'bigint' &&
        !(typeof t.amount === 'string' && /^[0-9]+$/.test(t.amount))
      )
        throw new Error(
          `"amount" in transfer at index ${index} must be a bigint or numeric string.`,
        );
      const amount = typeof t.amount === 'bigint' ? t.amount : BigInt(t.amount);
      if (amount <= 0)
        throw new Error(`"amount" in transfer at index ${index} must be a positive integer.`);
      return {
        from: t.from,
        to: t.to,
        amount: amount,
      };
    });
  }

  /**
   * Validates and sanitizes the list of data.
   * @param {Array<NewTransactionData>|undefined} data
   * @returns {Array<TransactionData>}
   */
  #dataValidator(data) {
    if (data === undefined) return [];
    if (!Array.isArray(data)) throw new Error('Data must be an array or undefined.');
    return data.map((t, index) => {
      if (typeof t !== 'object' || t === null)
        throw new Error(`Data entry at index ${index} must be a non-null object.`);

      if (!('address' in t)) throw new Error(`Missing "address" in data entry at index ${index}.`);
      if (!('addressType' in t))
        throw new Error(`Missing "addressType" in data entry at index ${index}.`);

      if (typeof t.address !== 'string' || !t.address.trim())
        throw new Error(`"address" in data entry at index ${index} must be a non-empty string.`);

      if (typeof t.addressType !== 'string' || !t.addressType.trim())
        throw new Error(
          `"addressType" in data entry at index ${index} must be a non-empty string.`,
        );

      if (!('payload' in t)) throw new Error(`Missing "payload" in data entry at index ${index}.`);

      if (this.#payloadString && typeof t.payload !== 'string')
        throw new Error(`"payload" in data entry at index ${index} must be a string.`);

      /** @type {Array<string>} */
      const bigintFields = ['gasLimit', 'gasUsed', 'maxFeePerGas', 'maxPriorityFeePerGas'];

      for (const field of bigintFields) {
        // @ts-ignore
        const value = t[field];
        if (typeof value !== 'bigint' && !(typeof value === 'string' && /^[0-9]+$/.test(value)))
          throw new Error(
            `"${field}" in data entry at index ${index} must be a bigint or numeric string.`,
          );
      }

      const gasLimit = typeof t.gasLimit === 'bigint' ? t.gasLimit : BigInt(t.gasLimit);
      const gasUsed = typeof t.gasUsed === 'bigint' ? t.gasUsed : BigInt(t.gasUsed);
      const maxFeePerGas =
        typeof t.maxFeePerGas === 'bigint' ? t.maxFeePerGas : BigInt(t.maxFeePerGas);
      const maxPriorityFeePerGas =
        typeof t.maxPriorityFeePerGas === 'bigint'
          ? t.maxPriorityFeePerGas
          : BigInt(t.maxPriorityFeePerGas);

      return {
        transfers: this.#transferValidator(t.transfers),
        address: t.address,
        addressType: t.addressType,
        payload: this.#payloadString ? t.payload : undefined,
        gasLimit,
        gasUsed,
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    });
  }

  /**
   * Validates and sanitizes a transaction index object.
   * Ensures all keys are valid numeric indices and values are valid transaction IDs.
   *
   * @param {object|undefined} txIndexObject
   * @returns {TxIndexMap}
   * @throws {Error} If keys are not valid numeric indices or values are invalid.
   */
  #validateTxIndexObject(txIndexObject) {
    if (txIndexObject === undefined) return {};
    if (typeof txIndexObject !== 'object' || txIndexObject === null || Array.isArray(txIndexObject))
      throw new Error('Transaction tx must be a plain object.');

    /** @type {TxIndexMap} */
    const result = {};
    for (const [key, value] of Object.entries(txIndexObject)) {
      if (typeof key !== 'string')
        throw new Error(`Invalid transaction index key "${key}": must be a string.`);
      result[key] = value;
    }
    return result;
  }

  /**
   * Validates and sanitizes a list of transaction signatures.
   * Ensures the input is an array of non-empty strings.
   *
   * @param {SignIndexMap|undefined} signatureList
   * @returns {SignIndexMap}
   * @throws {Error} If the input is not a valid array of strings.
   */
  #validateSignatureList(signatureList) {
    if (!Array.isArray(signatureList)) throw new Error('Transaction signatures must be an array.');
    for (const [index, sig] of signatureList.entries()) {
      if (typeof sig !== 'string' || sig.trim() === '')
        throw new Error(`Invalid signature at index ${index}: must be a non-empty string.`);
      if (!this.data || !(index in this.data))
        throw new Error(`Invalid signature index ${index}: no corresponding entry in "this.data".`);
    }
    return signatureList;
  }

  /**
   * Creates a new instance of a block with all necessary data and gas configuration.
   *
   * @param {BlockInitData} [options={}] - Configuration object.
   */
  constructor({
    firstValidation = true,
    payloadString = true,
    signer = new TinySecp256k1(),
    parser = new TinyCryptoParser(),
    time = Date.now(),
    chainId,
    txs,
    sigs,
    data,
    index = 0n,
    prevHash = '',
    diff = 1n,
    baseFeePerGas = 0n,
    reward = 0n,
    nonce = 0n,
    hash = null,
    miner = null,
  } = {}) {
    if (typeof time !== 'number') throw new Error('The timestamp need to be a number.');
    if (typeof payloadString !== 'boolean') throw new Error('payloadString must be a boolean.');
    this.#payloadString = payloadString;
    if (
      !(parser instanceof TinyCryptoParser) ||
      parser === null ||
      typeof parser.serializeDeep !== 'function'
    )
      throw new Error('parser must be an object with a serializeDeep() method.');
    this.#parser = parser;
    if (typeof time !== 'number' || !Number.isFinite(time) || time <= 0)
      throw new Error('timestamp must be a positive finite number.');
    this.time = time;
    if (typeof index !== 'bigint' && !(typeof index === 'string' && /^[0-9]+$/.test(index)))
      throw new Error('index must be a bigint or a numeric string.');
    this.index = typeof index === 'bigint' ? index : BigInt(index);
    if (
      typeof baseFeePerGas !== 'bigint' &&
      !(typeof baseFeePerGas === 'string' && /^[0-9]+$/.test(baseFeePerGas))
    )
      throw new Error('baseFeePerGas must be a bigint or a numeric string.');
    this.baseFeePerGas = typeof baseFeePerGas === 'bigint' ? baseFeePerGas : BigInt(baseFeePerGas);
    if (typeof prevHash !== 'string') throw new Error('prevHash must be a hash string.');
    this.prevHash = prevHash;
    if (typeof diff !== 'bigint' && !(typeof diff === 'string' && /^[0-9]+$/.test(diff)))
      throw new Error('difficulty must be a bigint or a numeric string.');
    this.diff = typeof diff === 'bigint' ? diff : BigInt(diff);
    if (typeof nonce !== 'bigint' && !(typeof nonce === 'string' && /^[0-9]+$/.test(nonce)))
      throw new Error('nonce must be a bigint or a numeric string.');
    this.nonce = typeof nonce === 'bigint' ? nonce : BigInt(nonce);
    if (typeof reward !== 'bigint' && !(typeof reward === 'string' && /^[0-9]+$/.test(reward)))
      throw new Error('reward must be a bigint or a numeric string.');
    this.reward = typeof reward === 'bigint' ? reward : BigInt(reward);

    if (typeof miner !== 'string' && miner !== null)
      throw new Error('miner must be a string or null.');
    this.miner = typeof miner === 'string' ? miner : null;

    if (typeof chainId !== 'bigint' && !(typeof chainId === 'string' && /^[0-9]+$/.test(chainId)))
      throw new Error('chainId must be a bigint or a numeric string.');
    this.chainId = typeof chainId === 'bigint' ? chainId : BigInt(chainId);

    if (!(signer instanceof TinySecp256k1))
      throw new Error('Invalid type for signer. Expected a TinySecp256k1.');
    this.#signer = signer;

    this.data = this.#dataValidator(data);
    if (this.data.length === 0) throw new Error('The block data cannot be empty.');

    if (typeof hash !== 'string' && hash !== null)
      throw new Error('hash must be a hash string or null.');
    this.hash = typeof hash !== 'string' ? this.calculateHash() : hash;

    this.txs = this.#validateTxIndexObject(txs);
    this.sigs = this.#validateSignatureList(sigs);

    if (firstValidation) this.validateSig();
  }

  /** @type {Record<string, string>} */
  invalidAddress = {
    0: 'NULL',
    1: 'UNKNOWN',
  };

  /**
   * Validates the integrity of each transaction inside the block by verifying
   * its ECDSA signature using the associated address.
   *
   * It loops through all transactions, serializes the corresponding data,
   * and ensures that the signature is valid. If any signature is invalid,
   * it throws an error identifying the problematic transaction and its index.
   *
   * @throws {Error} If any transaction has an invalid ECDSA signature,
   * or if any transaction has an address equal to "0".
   */
  validateSig() {
    const dc = this.getData();
    const sigs = this.getSigs();
    for (const index in dc) {
      const data = dc[index];
      const sig = sigs[index];
      const invalidValue = this.invalidAddress[data.address];
      if (typeof invalidValue === 'string')
        throw new Error(
          `Transaction at index "${index}" has an invalid address "${data.address}" (${invalidValue}).`,
        );
      if (
        !this.#signer.verifyECDSA(
          this.#parser.serializeDeep(data),
          Buffer.from(sig, 'hex'),
          data.address,
          'utf-8',
        )
      )
        throw new Error(`Invalid block signature in the index "${index}".`);
    }
  }

  /**
   * Stops the mining process by setting the internal stop flag.
   * This allows asynchronous mining loops to exit gracefully.
   *
   * @returns {void}
   */
  stopMining() {
    this.#stopRequested = true;
  }

  /**
   * Returns a plain object representing all public data of the block.
   * @returns {GetTransactionData}
   */
  get() {
    return {
      chainId: this.getChainId(),
      index: this.getIndex(),
      time: this.getTime(),
      data: this.getData(),
      baseFeePerGas: this.getBaseFeePerGas(),
      prevHash: this.getPrevHash(),
      diff: this.getDiff(),
      nonce: this.getNonce(),
      hash: this.getHash(),
      reward: this.getReward(),
      miner: this.getMiner(),
      txs: this.getTxs(),
      sigs: this.getSigs(),
    };
  }

  /**
   * Serializes the block using the parser for export.
   * @returns {string}
   */
  export() {
    const data = this.get();
    return this.#parser.serializeDeep(data);
  }

  /**
   * Calculates the SHA-256 hash of the block based on its contents.
   * @returns {string}
   */
  calculateHash() {
    let value = '';
    value += String(this.time);
    value += this.getPrevHash();
    value += this.#parser.serializeDeep(this.data);
    value += this.#parser.serialize(this.sigs);
    value += this.getIndex().toString();
    value += this.getBaseFeePerGas().toString();
    value += this.getNonce().toString();
    value += this.getChainId().toString();
    return createHash('sha256').update(Buffer.from(value, 'utf-8')).digest('hex');
  }

  /**
   * Generates a unique transaction ID (TX ID) based on its contents.
   *
   * @param {number} index
   * @returns {string} SHA256 hash as the TX ID
   * @throws {Error} If this.data is not an array
   * @throws {Error} If the index is out of bounds
   */
  generateTxId(index) {
    if (typeof index !== 'number') throw new Error(`Invalid index: must be a number.`);
    const data = this.getData()[index];
    if (typeof data !== 'object')
      throw new Error(`Invalid index: must be a number between 0 and ${this.data.length - 1}.`);
    return createHash('sha256')
      .update(Buffer.from(this.#parser.serializeDeep(this.data[index]), 'utf-8'))
      .digest('hex');
  }

  /**
   * Mines the block until a valid hash is found.
   * @param {string|null} minerAddress - Address of the miner.
   * @param {{ prevHash?: string, index?: bigint, onComplete?: function, onProgress?: function }} [options={}]
   * @returns {Promise<{ nonce: bigint, hash: string, success: boolean }>}
   * @throws {Error} If the address is invalid.
   */
  async mine(minerAddress = null, { prevHash = '0', index = 0n, onComplete, onProgress } = {}) {
    if (typeof minerAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof minerAddress}"`);

    if (minerAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    const difficultyPrefix = '0'.repeat(Number(this.diff));
    let attempts = 0;
    const startTime = Date.now();

    this.index = index;
    this.prevHash = prevHash;
    this.time = startTime;

    const mineStep = async () => {
      for (let i = 0; i < 10000; i++) {
        if (this.#stopRequested) return { nonce: this.nonce, hash: this.hash, success: false };

        this.nonce++;
        this.hash = this.calculateHash();
        attempts++;

        if (this.hash.startsWith(difficultyPrefix)) {
          const endTime = Date.now();
          const elapsedSeconds = (endTime - startTime) / 1000;
          const hashrate = (attempts / elapsedSeconds).toFixed(2);
          if (typeof onComplete === 'function') onComplete(parseFloat(hashrate));
          if (minerAddress) this.miner = minerAddress;

          this.txs = {};
          if (Array.isArray(this.data)) {
            for (const dataIndex in this.data) {
              const index = Number(dataIndex);
              const tx = this.generateTxId(index);
              this.txs[tx] = index;
            }
          }

          return { nonce: this.nonce, hash: this.hash, success: true };
        }
      }

      if (typeof onProgress === 'function') {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        const currentHashrate = (attempts / elapsedSeconds).toFixed(2);
        onProgress(parseFloat(currentHashrate));
      }

      // Yield to the event loop to avoid blocking
      await new Promise((resolve) => setImmediate(resolve));
      return mineStep();
    };

    return mineStep();
  }

  /**
   * Returns a validated view of the internal transaction index map.
   *
   * @returns {TxIndexMap}
   * @throws {Error} If internal txs object is invalid.
   */
  getTxs() {
    if (typeof this.txs !== 'object' || this.txs === null || Array.isArray(this.txs))
      throw new Error('Transaction tx list must be a plain object.');
    return this.txs;
  }

  /**
   * Retrieves a transaction's data by its transaction ID.
   *
   * @param {string} tx - The transaction ID used as key in the transaction index map.
   * @returns {TransactionData} The corresponding transaction data.
   * @throws {Error} If the transaction ID is not found in the data list.
   */
  getTx(tx) {
    const txs = this.getTxs();
    const txData = this.data[txs[tx]];
    if (!txData) throw new Error(`Transaction data not found for tx ID "${tx}".`);
    return txData;
  }

  /**
   * Returns the parser instance responsible for cryptographic serialization and hashing.
   * @returns {TinyCryptoParser}
   */
  getParser() {
    if (!(this.#parser instanceof TinyCryptoParser))
      throw new Error('Parser is not a valid TinyCryptoParser instance');
    return this.#parser;
  }

  /**
   * Returns the signer instance responsible for signing and verifying cryptographic data.
   * @returns {TinySecp256k1}
   */
  getSigner() {
    if (!(this.#signer instanceof TinySecp256k1))
      throw new Error('Signer is not a valid TinySecp256k1 instance');
    return this.#signer;
  }

  /**
   * Returns the timestamp when the block was created.
   * @returns {number}
   */
  getTime() {
    if (typeof this.time !== 'number' || !Number.isInteger(this.time) || this.time < 0)
      throw new Error('Time must be a non-negative integer');
    return this.time;
  }

  /**
   * Returns the index of the block in the blockchain.
   * @returns {bigint}
   */
  getIndex() {
    if (typeof this.index !== 'bigint' || this.index < 0n)
      throw new Error('Index must be a non-negative bigint');
    return this.index;
  }

  /**
   * Returns the chain ID of the blockchain instance.
   * @returns {bigint}
   */
  getChainId() {
    if (typeof this.chainId !== 'bigint' || this.chainId < 0n)
      throw new Error('Chain ID must be a non-negative bigint');
    return this.chainId;
  }

  /**
   * Returns the hash of the previous block.
   * @returns {string|null}
   */
  getPrevHash() {
    if (this.prevHash !== null && typeof this.prevHash !== 'string')
      throw new Error('Previous hash must be a string or null');
    return this.prevHash;
  }

  /**
   * Returns the difficulty level of the block.
   * @returns {bigint}
   */
  getDiff() {
    if (typeof this.diff !== 'bigint' || this.diff < 0n)
      throw new Error('Difficulty must be a non-negative bigint');
    return this.diff;
  }

  /**
   * Returns the reward for mining the block.
   * @returns {bigint}
   */
  getReward() {
    if (typeof this.reward !== 'bigint' || this.reward < 0n)
      throw new Error('Reward must be a non-negative bigint');
    return this.reward;
  }

  /**
   * Returns the nonce used for mining.
   * @returns {bigint}
   */
  getNonce() {
    if (typeof this.nonce !== 'bigint' || this.nonce < 0n)
      throw new Error('Nonce must be a non-negative bigint');
    return this.nonce;
  }

  /**
   * Returns the miner's address who mined the block.
   * @returns {string|null}
   */
  getMiner() {
    if (this.miner !== null && typeof this.miner !== 'string')
      throw new Error('Miner must be a string or null');
    return this.miner;
  }

  /**
   * Returns the block data.
   * @returns {TransactionData[]}
   */
  getData() {
    if (!Array.isArray(this.data)) throw new Error('Data must be an array of TransactionData');
    return this.data;
  }

  /**
   * Returns the list of signatures attached to the block.
   * @returns {SignIndexMap}
   */
  getSigs() {
    if (!Array.isArray(this.sigs)) throw new Error('Signatures must be an array of SignatureData');
    return this.sigs;
  }

  /**
   * Returns the current hash of the block.
   * @returns {string}
   */
  getHash() {
    if (typeof this.hash !== 'string') throw new Error('Hash must be a string');
    return this.hash;
  }

  /**
   * Returns the base fee per gas (in gwei).
   * @returns {bigint}
   */
  getBaseFeePerGas() {
    if (typeof this.baseFeePerGas !== 'bigint') throw new Error('baseFeePerGas must be a bigint');
    return this.baseFeePerGas;
  }
}

export default TinyChainBlock;
