// @ts-nocheck
import { createHash } from 'crypto';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

class TinyChainBlock {
  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser;

  #transferValidator(transfers) {
    if (Array.isArray(transfers))
      return transfers.map((t) => ({
        from: String(t.from),
        to: String(t.to),
        amount: BigInt(t.amount),
      }));
    else return [];
  }

  constructor({
    payloadString = true,
    parser,
    timestamp = Date.now(),
    address,
    payload,
    transfers,
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

  exportBlock() {
    const data = this.get();
    return this.#parser.serializeDeep(data);
  }

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

  #validateMinerName(execAddress) {
    if (typeof execAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);

    if (execAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    return true;
  }

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
}

export default TinyChainBlock;
