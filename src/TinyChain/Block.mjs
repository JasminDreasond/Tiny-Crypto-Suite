import { createHash } from 'crypto';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

class TinyChainBlock {
  /**
   * @typedef {Object} Transaction
   * @property {string} from - The sender's address
   * @property {string} to - The recipient's address
   * @property {bigint} amount - The amount of the transaction
   */

  /**
   * @typedef {Object} NewTransaction
   * @property {string} from - The sender's address
   * @property {string} to - The recipient's address
   * @property {string | number | bigint} amount - The amount of the transaction
   */

  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser;

  /**
   * Validates and sanitizes the list of transfers.
   * @param {Array<NewTransaction>|undefined} transfers
   * @returns {Array<Transaction>}
   */
  #transferValidator(transfers) {
    if (Array.isArray(transfers))
      return transfers.map((t) => ({
        from: String(t.from),
        to: String(t.to),
        amount: BigInt(t.amount),
      }));
    else return [];
  }

  /**
   * Creates a new instance of a block with all necessary data and gas configuration.
   *
   * @param {Object} [options={}] - Configuration object.
   * @param {boolean} [options.payloadString=true] - If true, payload must be a string.
   * @param {TinyCryptoParser} [options.parser] - Parser instance used for deep serialization.
   * @param {number} [options.timestamp=Date.now()] - Unix timestamp of the block.
   * @param {string} [options.address=''] - Address that created the block.
   * @param {string} [options.payload=''] - Payload content (usually a string).
   * @param {Array<NewTransaction>} [options.transfers=[]] - Transfer list.
   * @param {bigint | number | string} [options.index=0n] - Block index.
   * @param {string} [options.previousHash=''] - Hash of the previous block.
   * @param {bigint | number | string} [options.difficulty=1n] - Mining difficulty.
   * @param {bigint | number | string} [options.reward=0n] - Block reward.
   * @param {bigint | number | string} [options.nonce=0n] - Starting nonce.
   * @param {string|null} [options.hash=null] - Optional precomputed hash.
   * @param {string|null} [options.miner=null] - Address of the miner.
   * @param {bigint | number | string} [options.gasLimit=0n] - Max gas allowed for transactions.
   * @param {bigint | number | string} [options.gasUsed=0n] - Actual gas used.
   * @param {bigint | number | string} [options.baseFeePerGas=0n] - Base fee per gas unit.
   * @param {bigint | number | string} [options.maxPriorityFeePerGas=0n] - Priority fee paid to the miner.
   * @param {bigint | number | string} [options.maxFeePerGas=0n] - Max total fee per gas unit allowed.
   */
  constructor({
    payloadString = true,
    parser = new TinyCryptoParser(),
    timestamp = Date.now(),
    address = '',
    payload = '',
    transfers = [],
    index = 0n,
    previousHash = '',
    difficulty = 1n,
    reward = 0n,
    nonce = 0n,
    hash = null,
    miner = null,

    // Gas fee structure
    gasLimit = 0n,
    gasUsed = 0n,
    baseFeePerGas = 0n,
    maxPriorityFeePerGas = 0n,
    maxFeePerGas = 0n,
  } = {}) {
    if (payloadString && typeof payload !== 'string')
      throw new Error('The payload need to be a string.');
    if (typeof address !== 'string') throw new Error('The address need to be a string.');
    if (typeof timestamp !== 'number') throw new Error('The timestamp need to be a number.');
    this.transfers = this.#transferValidator(transfers);

    this.#parser = parser;
    this.timestamp = timestamp;
    this.address = address;
    this.payload = payload;
    this.index = typeof index !== 'bigint' ? BigInt(index) : index;
    this.previousHash = typeof previousHash === 'string' ? previousHash : null;
    this.difficulty = typeof difficulty !== 'bigint' ? BigInt(difficulty) : difficulty;
    this.nonce = typeof nonce !== 'bigint' ? BigInt(nonce) : nonce;
    this.reward = typeof reward !== 'bigint' ? BigInt(reward) : reward;
    this.miner = typeof miner === 'string' ? miner : null;

    // Gas-related values
    this.gasLimit = BigInt(gasLimit);
    this.gasUsed = BigInt(gasUsed); // In real cases, you'd calculate this dynamically
    this.baseFeePerGas = BigInt(baseFeePerGas);
    this.maxPriorityFeePerGas = BigInt(maxPriorityFeePerGas);
    this.maxFeePerGas = BigInt(maxFeePerGas);

    this.effectiveGasPrice = this.baseFeePerGas + this.maxPriorityFeePerGas;
    this.totalFeePaid = this.effectiveGasPrice * this.gasUsed;

    this.hash = typeof hash !== 'string' ? this.calculateHash() : hash;
  }

  /**
   * Returns a plain object representing all public data of the block.
   * @returns {{
   *   index: bigint,
   *   timestamp: number,
   *   address: string,
   *   payload: string,
   *   transfers: Transaction[],
   *   previousHash: string|null,
   *   difficulty: bigint,
   *   nonce: bigint,
   *   hash: string,
   *   reward: bigint,
   *   miner: string|null,
   *   gasLimit: bigint,
   *   gasUsed: bigint,
   *   baseFeePerGas: bigint,
   *   maxPriorityFeePerGas: bigint,
   *   maxFeePerGas: bigint,
   *   effectiveGasPrice: bigint,
   *   totalFeePaid: bigint
   * }}
   */
  get() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      address: this.address,
      payload: this.payload,
      transfers: this.transfers,
      previousHash: this.previousHash,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      reward: this.reward,
      miner: this.miner,

      // Gas-related values
      gasLimit: this.gasLimit,
      gasUsed: this.gasUsed,
      baseFeePerGas: this.baseFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
      maxFeePerGas: this.maxFeePerGas,
      effectiveGasPrice: this.effectiveGasPrice,
      totalFeePaid: this.totalFeePaid,
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
    const data = {
      payload: this.payload,
      transfers: this.transfers,
    };

    let value = '';
    value += this.address;
    value += this.timestamp;
    value += this.previousHash;
    value += this.#parser.serializeDeep(data);
    value += this.index.toString();
    value += this.nonce.toString();
    value += this.gasLimit.toString();
    value += this.gasUsed.toString();
    value += this.baseFeePerGas.toString();
    value += this.maxPriorityFeePerGas.toString();
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Validates if the provided miner address is a non-empty string.
   * @param {string|null} execAddress
   * @returns {true}
   * @throws {Error} If the address is invalid.
   */
  #validateMinerName(execAddress) {
    if (typeof execAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);

    if (execAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    return true;
  }

  /**
   * Asynchronously mines the block until a valid hash is found (without freeze risk).
   * @param {string|null} minerAddress - Address of the miner.
   * @param {{ previousHash?: string, index?: bigint }} [options={}]
   * @returns {Promise<{ nonce: bigint, hash: string }>}
   */
  async mineBlockAsync(minerAddress = null, { previousHash = '0', index = 0n } = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.#validateMinerName(minerAddress);
      } catch (err) {
        reject(err);
      } finally {
        const target = '0'.repeat(Number(this.difficulty));
        this.index = index;
        this.previousHash = previousHash;

        const mine = () => {
          while (!this.hash.startsWith(target)) {
            this.nonce++;
            this.hash = this.calculateHash();
            if (this.nonce % 1000n === 0n) return setTimeout(mine, 0);
          }

          if (minerAddress) this.miner = minerAddress;
          resolve({ nonce: this.nonce, hash: this.hash });
        };
        mine();
      }
    });
  }

  /**
   * Synchronously mines the block until a valid hash is found.
   * @param {string|null} minerAddress - Address of the miner.
   * @param {{ previousHash?: string, index?: bigint }} [options={}]
   * @returns {{ nonce: bigint, hash: string }}
   */
  mineBlock(minerAddress = null, { previousHash = '0', index = 0n } = {}) {
    this.#validateMinerName(minerAddress);
    const target = '0'.repeat(Number(this.difficulty));
    this.index = index;
    this.previousHash = previousHash;

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    if (minerAddress) this.miner = minerAddress;
    return { nonce: this.nonce, hash: this.hash };
  }

  /**
   * Returns the validated transfer list.
   * @returns {Transaction[]}
   */
  getTransfers() {
    return this.transfers;
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
   * Returns the address that created the block.
   * @returns {string}
   */
  getAddress() {
    return this.address;
  }

  /**
   * Returns the data payload stored in the block.
   * @returns {string}
   */
  getPayload() {
    return this.payload;
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
   * Returns the gas limit assigned to this block.
   * @returns {bigint}
   */
  getGasLimit() {
    return this.gasLimit;
  }

  /**
   * Returns the amount of gas used during execution.
   * @returns {bigint}
   */
  getGasUsed() {
    return this.gasUsed;
  }

  /**
   * Returns the base fee per gas unit.
   * @returns {bigint}
   */
  getBaseFeePerGas() {
    return this.baseFeePerGas;
  }

  /**
   * Returns the maximum priority fee per gas unit.
   * @returns {bigint}
   */
  getMaxPriorityFeePerGas() {
    return this.maxPriorityFeePerGas;
  }

  /**
   * Returns the maximum total fee per gas unit.
   * @returns {bigint}
   */
  getMaxFeePerGas() {
    return this.maxFeePerGas;
  }

  /**
   * Returns the effective gas price (base fee + priority fee).
   * @returns {bigint}
   */
  getEffectiveGasPrice() {
    return this.effectiveGasPrice;
  }

  /**
   * Returns the total fee paid (effective price * gas used).
   * @returns {bigint}
   */
  getTotalFeePaid() {
    return this.totalFeePaid;
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
