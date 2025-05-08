import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

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
 * @property {bigint | number | string} baseFeePerGas - Base fee per gas unit.
 * @property {bigint | number | string} maxPriorityFeePerGas - Priority fee paid to the miner.
 * @property {bigint | number | string} maxFeePerGas - Max total fee per gas unit allowed.
 * @property {string} address - Address that created the block.
 * @property {*} payload - Payload content (usually a string).
 * @property {Array<NewTransaction>} transfers - Transfer list.
 */

/**
 * @typedef {Object} TransactionData
 * @property {bigint} gasLimit - Max gas allowed for transactions.
 * @property {bigint} gasUsed - Actual gas used.
 * @property {bigint} baseFeePerGas - Base fee per gas unit.
 * @property {bigint} maxPriorityFeePerGas - Priority fee paid to the miner.
 * @property {bigint} maxFeePerGas - Max total fee per gas unit allowed.
 * @property {string} address - Address that created the block.
 * @property {*} payload - Payload content (usually a string).
 * @property {Array<NewTransaction>} transfers - Transfer list.
 */

/**
 * @typedef {{
 *   index: bigint,
 *   timestamp: number,
 *   data: TransactionData[],
 *   previousHash: string|null,
 *   difficulty: bigint,
 *   nonce: bigint,
 *   hash: string,
 *   reward: bigint,
 *   miner: string|null,
 *   chainId: bigint,
 *   txs: TxIndexMap,
 * }} GetTransactionData
 */

/**
 * @typedef {Record.<string, number>} TxIndexMap
 * A map where each key is a transaction index (as a string) and the value is the transaction ID (string or number).
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
 * This class assumes values like `index`, `previousHash`, and `minerAddress`
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

  #payloadString = false;
  #stopRequested = false;

  /**
   * Validates and sanitizes the list of transfers.
   * @param {Array<NewTransaction>|undefined} transfers
   * @returns {Array<Transaction>}
   * @throws {Error} If any transfer is invalid or has invalid types.
   */
  #transferValidator(transfers) {
    if (transfers === undefined) return [];
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

      if (typeof t.address !== 'string' || !t.address.trim())
        throw new Error(`"address" in data entry at index ${index} must be a non-empty string.`);

      if (!('payload' in t)) throw new Error(`Missing "payload" in data entry at index ${index}.`);

      if (this.#payloadString && typeof t.payload !== 'string')
        throw new Error(`"payload" in data entry at index ${index} must be a string.`);

      /** @type {Array<string>} */
      const bigintFields = [
        'gasLimit',
        'gasUsed',
        'baseFeePerGas',
        'maxFeePerGas',
        'maxPriorityFeePerGas',
      ];

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
      const baseFeePerGas =
        typeof t.baseFeePerGas === 'bigint' ? t.baseFeePerGas : BigInt(t.baseFeePerGas);
      const maxFeePerGas =
        typeof t.maxFeePerGas === 'bigint' ? t.maxFeePerGas : BigInt(t.maxFeePerGas);
      const maxPriorityFeePerGas =
        typeof t.maxPriorityFeePerGas === 'bigint'
          ? t.maxPriorityFeePerGas
          : BigInt(t.maxPriorityFeePerGas);

      return {
        transfers: this.#transferValidator(t.transfers),
        address: t.address,
        payload: this.#payloadString ? t.payload : undefined,
        gasLimit,
        gasUsed,
        baseFeePerGas,
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
      throw new Error('Transaction index must be a plain object.');

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
   * Creates a new instance of a block with all necessary data and gas configuration.
   *
   * @param {Object} [options={}] - Configuration object.
   * @param {boolean} [options.payloadString=true] - If true, payload must be a string.
   * @param {TinyCryptoParser} [options.parser] - Parser instance used for deep serialization.
   * @param {bigint | number | string} [options.index=0n] - Block index.
   * @param {string} [options.previousHash=''] - Hash of the previous block.
   * @param {bigint | number | string} [options.difficulty=1n] - Mining difficulty.
   * @param {bigint | number | string} [options.reward=0n] - Block reward.
   * @param {bigint | number | string} [options.nonce=0n] - Starting nonce.
   * @param {bigint | number | string} [options.chainId] - The chain ID.
   * @param {TxIndexMap} [options.txs] - A map where each key is a transaction index.
   * @param {number} [options.timestamp=Date.now()] - Unix timestamp of the block.
   * @param {string|null} [options.hash=null] - Optional precomputed hash.
   * @param {string|null} [options.miner=null] - Address of the miner.
   * @param {NewTransactionData[]} [options.data=[]] - Block data.
   */
  constructor({
    payloadString = true,
    parser = new TinyCryptoParser(),
    timestamp = Date.now(),
    chainId,
    txs,
    data,
    index = 0n,
    previousHash = '',
    difficulty = 1n,
    reward = 0n,
    nonce = 0n,
    hash = null,
    miner = null,
  } = {}) {
    if (typeof timestamp !== 'number') throw new Error('The timestamp need to be a number.');
    if (typeof payloadString !== 'boolean') throw new Error('payloadString must be a boolean.');
    this.#payloadString = payloadString;
    if (typeof parser !== 'object' || parser === null || typeof parser.serializeDeep !== 'function')
      throw new Error('parser must be an object with a serializeDeep() method.');
    this.#parser = parser;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0)
      throw new Error('timestamp must be a positive finite number.');
    this.timestamp = timestamp;
    if (typeof index !== 'bigint' && !(typeof index === 'string' && /^[0-9]+$/.test(index)))
      throw new Error('index must be a bigint or a numeric string.');
    this.index = typeof index === 'bigint' ? index : BigInt(index);
    if (typeof previousHash !== 'string') throw new Error('previousHash must be a hash string.');
    this.previousHash = previousHash;
    if (
      typeof difficulty !== 'bigint' &&
      !(typeof difficulty === 'string' && /^[0-9]+$/.test(difficulty))
    )
      throw new Error('difficulty must be a bigint or a numeric string.');
    this.difficulty = typeof difficulty === 'bigint' ? difficulty : BigInt(difficulty);
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

    this.data = this.#dataValidator(data);
    if (this.data.length === 0) throw new Error('The block data cannot be empty.');
    this.txs = this.#validateTxIndexObject(txs);

    if (typeof hash !== 'string' && hash !== null)
      throw new Error('hash must be a hash string or null.');
    this.hash = typeof hash !== 'string' ? this.calculateHash() : hash;
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
      chainId: this.chainId,
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      reward: this.reward,
      miner: this.miner,
      txs: this.txs,
    };
  }

  /**
   * Serializes the block using the parser for export.
   * @returns {string}
   */
  exportBlock() {
    const data = this.get();
    return this.#parser.serializeDeep(data);
  }

  /**
   * Calculates the SHA-256 hash of the block based on its contents.
   * @returns {string}
   */
  calculateHash() {
    let value = '';
    value += String(this.timestamp);
    value += this.previousHash;
    value += this.#parser.serializeDeep(this.data);
    value += this.index.toString();
    value += this.nonce.toString();
    value += this.chainId.toString();
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
    if (!Array.isArray(this.data)) throw new Error('Invalid data: this.data must be an array.');
    if (typeof index !== 'number') throw new Error(`Invalid index: must be a number.`);
    const data = this.data[index];
    if (typeof data !== 'object')
      throw new Error(`Invalid index: must be a number between 0 and ${this.data.length - 1}.`);
    return createHash('sha256')
      .update(Buffer.from(this.#parser.serializeDeep(this.data[index]), 'utf-8'))
      .digest('hex');
  }

  /**
   * Mines the block until a valid hash is found.
   * @param {string|null} minerAddress - Address of the miner.
   * @param {{ previousHash?: string, index?: bigint, onComplete?: function, onProgress?: function }} [options={}]
   * @returns {Promise<{ nonce: bigint, hash: string, success: boolean }>}
   * @throws {Error} If the address is invalid.
   */
  async mine(minerAddress = null, { previousHash = '0', index = 0n, onComplete, onProgress } = {}) {
    if (typeof minerAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof minerAddress}"`);

    if (minerAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    const difficultyPrefix = '0'.repeat(Number(this.difficulty));
    let attempts = 0;
    const startTime = Date.now();

    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = startTime;

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
   * Returns the parser instance used for hashing and serialization.
   * @returns {TinyCryptoParser}
   */
  getParser() {
    return this.#parser;
  }

  /**
   * Returns the timestamp when the block was created.
   * @returns {number}
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Returns the index of the block in the blockchain.
   * @returns {bigint}
   */
  getIndex() {
    return this.index;
  }

  /**
   * Returns the hash of the previous block.
   * @returns {string|null}
   */
  getPreviousHash() {
    return this.previousHash;
  }

  /**
   * Returns the difficulty level of the block.
   * @returns {bigint}
   */
  getDifficulty() {
    return this.difficulty;
  }

  /**
   * Returns the reward for mining the block.
   * @returns {bigint}
   */
  getReward() {
    return this.reward;
  }

  /**
   * Returns the nonce used for mining.
   * @returns {bigint}
   */
  getNonce() {
    return this.nonce;
  }

  /**
   * Returns the miner's address who mined the block.
   * @returns {string|null}
   */
  getMiner() {
    return this.miner;
  }

  /**
   * Returns the block data.
   * @returns {TransactionData[]}
   */
  getData() {
    return this.data;
  }

  /**
   * Returns the current hash of the block.
   * @returns {string}
   */
  getHash() {
    return this.hash;
  }
}

export default TinyChainBlock;
