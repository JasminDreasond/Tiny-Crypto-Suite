// @ts-nocheck
import { TinyPromiseQueue } from 'tiny-essentials';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

import TinyChainBlock from './Block.mjs';

class TinyChainInstance {
  /**
   * Important instance used to make request queue.
   * @type {TinyPromiseQueue}
   */
  #queue = new TinyPromiseQueue();

  /**
   * Important instance used to validate values.
   * @type {TinyCryptoParser}
   */
  #parser = new TinyCryptoParser();

  #payloadString = true;

  /**
   * Add a new value type and its converter function.
   * @param {string} typeName
   * @param {(data: any) => any} getFunction
   * @param {(data: any) => { __type: string, value?: any }} convertFunction
   */
  addValueType(typeName, getFunction, convertFunction) {
    return this.#parser.addValueType(typeName, getFunction, convertFunction);
  }

  createGenesisBlock() {
    return this.#createBlockInstance({
      index: 0n,
      timestamp: Date.now(),
      address: '',
      payload: 'Genesis Block',
      previousHash: '0',
    });
  }

  hasGenesisBlock() {
    if (this.chain.length === 0) return false;
    const firstBlock = this.chain[0];
    return firstBlock.index === 0n && firstBlock.previousHash === '0' && firstBlock.address === '';
  }

  burnedBalance = BigInt(0);
  chain = [this.createGenesisBlock()];

  constructor({
    transferGas = 15000, // symbolic per transfer, varies in real EVM
    baseFeePerGas = 21000,
    priorityFeeDefault = 2,
    difficulty = 1,
    payloadString = true,
    currencyMode = false,
    initialReward = 15000000000000000000,
    halvingInterval = 100,
    initialBalances = {},
    admins = [],
  } = {}) {
    this.#payloadString = payloadString;
    this.admins = new Set(admins);
    this.currencyMode = currencyMode;

    this.transferGas = BigInt(transferGas);
    this.baseFeePerGas = BigInt(baseFeePerGas); // initial base value Fee in gwei
    this.priorityFeeDefault = BigInt(priorityFeeDefault); // default priority in gwei
    this.difficulty = BigInt(difficulty);
    this.initialReward = BigInt(initialReward);
    this.halvingInterval = BigInt(halvingInterval);

    if (currencyMode) this.initialBalances = initialBalances;
    this.startBalances();
  }

  #createBlockInstance(options) {
    return new TinyChainBlock({
      payloadString: this.#payloadString,
      parser: this.#parser,
      ...options,
    });
  }

  /**
   * Sets the default base fee per gas (in gwei).
   * @param {bigint} value
   */
  setBaseFeePerGas(value) {
    this.baseFeePerGas = BigInt(value);
  }

  /**
   * Sets the default max priority fee per gas (in gwei).
   * @param {bigint} value
   */
  setDefaultPriorityFee(value) {
    this.priorityFeeDefault = BigInt(value);
  }

  /**
   * Simulates gas estimation for an Ethereum-like transaction.
   * Considers base cost, data size, and per-transfer cost.
   * @param {Array} transfers - List of transfers (e.g., token or balance movements).
   * @param {any} payloadData - Data to be included in the transaction (e.g., contract call).
   * @returns {bigint}
   */
  estimateGasUsed(transfers, payloadData) {
    const ZERO_BYTE_COST = 4n;
    const NONZERO_BYTE_COST = 16n;

    // Serialize and calculate gas per byte (mimicking Ethereum rules)
    const serialized = this.#parser.serializeDeep(payloadData);
    let dataGas = 0n;
    for (let i = 0; i < serialized.length; i++) {
      dataGas += serialized[i] === 0 ? ZERO_BYTE_COST : NONZERO_BYTE_COST;
    }

    // Transfer gas cost (symbolic)
    const transferCount = Array.isArray(transfers) ? BigInt(transfers.length) : 0n;
    const transfersGas = transferCount * this.transferGas;

    return dataGas + transfersGas;
  }

  /**
   * Compute effective gas price from baseFee and tip.
   * @param {bigint} baseFeePerGas
   * @param {bigint} maxPriorityFeePerGas
   * @param {bigint} maxFeePerGas
   * @returns {bigint}
   */
  computeEffectiveGasPrice(maxPriorityFeePerGas, maxFeePerGas) {
    const tip = maxPriorityFeePerGas;
    const price = this.baseFeePerGas + tip;
    return price > maxFeePerGas ? maxFeePerGas : price;
  }

  isValid(startIndex = 0, endIndex = null) {
    const end = endIndex ?? this.chain.length - 1;

    for (let i = Math.max(startIndex, 1); i <= end; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (!current) return null;
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }

    return true;
  }

  getCurrentReward() {
    const height = BigInt(this.chain.length);
    const halvings = height / this.halvingInterval;
    const reward = this.initialReward / 2n ** halvings;
    return reward > 0n ? reward : 0n;
  }

  createBlock(execAddress, payloadData = '', transfers = [], gasOptions = {}) {
    if (typeof execAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);

    if (execAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    const reward = this.getCurrentReward();
    const {
      gasLimit = 50000n,
      maxFeePerGas = 200n,
      maxPriorityFeePerGas = this.priorityFeeDefault,
    } = gasOptions;

    const gasUsed = this.estimateGasUsed(transfers, payloadData);
    const effectiveGasPrice = this.computeEffectiveGasPrice(maxPriorityFeePerGas, maxFeePerGas);
    const totalFeePaid = gasUsed * effectiveGasPrice;

    if (gasUsed > gasLimit)
      throw new Error(`Gas limit exceeded: used ${gasUsed} > limit ${gasLimit}`);

    return this.#createBlockInstance({
      address: execAddress,
      payload: payloadData,
      transfers,
      difficulty: this.difficulty,
      reward,
      gasLimit,
      gasUsed,
      baseFeePerGas: this.baseFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      effectiveGasPrice,
      totalFeePaid,
    });
  }

  #insertNewBlock(newBlock) {
    if (this.currencyMode) this.updateBalance(newBlock);
    this.chain.push(newBlock);
  }

  #getPrevsBlockData() {
    const previousBlock = this.getLatestBlock();
    return { previousHash: previousBlock.hash, index: previousBlock.index + 1n };
  }

  mineBlock(minerAddress, newBlock) {
    return this.#queue.enqueue(async () => {
      newBlock.mineBlock(minerAddress, this.#getPrevsBlockData());
      this.#insertNewBlock(newBlock);
      return newBlock;
    });
  }

  mineBlockAsync(minerAddress, newBlock) {
    return this.#queue.enqueue(async () => {
      await newBlock.mineBlockAsync(minerAddress, this.#getPrevsBlockData());
      this.#insertNewBlock(newBlock);
      return newBlock;
    });
  }

  getLatestBlock() {
    return this.getChainValue(this.chain.length - 1);
  }

  startBalances() {
    this.balances = {};
    if (this.currencyMode)
      for (const [user, balance] of Object.entries(this.initialBalances))
        this.balances[user] = BigInt(balance);
  }

  updateBalance(block) {
    const transfers = block.transfers;
    const execAddress = block.address;
    const reward = block.reward;
    const minerAddress = block.miner;

    if (typeof execAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);
    if (execAddress.length < 1) return;

    if (typeof reward !== 'bigint')
      throw new Error(`Invalid reward: expected a BigInt, got "${typeof reward}"`);

    const isAdmin = this.admins.has(execAddress);
    if (Array.isArray(transfers)) {
      for (const { from, to, amount } of transfers) {
        if (typeof from !== 'string' || typeof to !== 'string' || from.length < 1 || to.length < 1)
          throw new Error('Invalid from/to address!');

        if (!isAdmin && from !== execAddress)
          throw new Error(`Non-admins can only send their own balance.`);

        if (this.balances[from] < amount)
          throw new Error(`Insufficient balance for user "${from}" (needs ${amount})`);
      }
    }

    let totalGasCollected = 0n;
    let totalAmount = 0n;

    if (Array.isArray(transfers)) {
      for (const tx of transfers) totalAmount += tx.amount;
    }

    const gasFee = block.totalFeePaid ?? 0n;
    const totalCost = totalAmount + gasFee;

    if (!this.balances[execAddress]) this.balances[execAddress] = 0n;
    const isSufficientBalance = this.balances[execAddress] > totalCost ? true : false;

    if (isSufficientBalance) {
      totalGasCollected += gasFee;
      this.balances[execAddress] -= totalCost;
    } else {
      totalGasCollected += this.balances[execAddress];
      this.balances[execAddress] = 0n;
    }

    if (isSufficientBalance) {
      for (const { from, to, amount } of transfers) {
        if (!this.balances[from]) this.balances[from] = 0n;
        if (!this.balances[to]) this.balances[to] = 0n;
        this.balances[from] -= amount;
        this.balances[to] += amount;
      }
    }

    if (typeof minerAddress === 'string' && minerAddress.length > 0) {
      if (!this.balances[minerAddress]) this.balances[minerAddress] = 0n;
      this.balances[minerAddress] += reward + totalGasCollected;
    } else {
      this.burnedBalance = reward + totalGasCollected;
    }
  }

  getBalances(toString = true) {
    if (!this.currencyMode) return null;
    const result = {};
    for (const [addr, amount] of Object.entries(this.balances))
      result[addr] = toString ? amount.toString() : amount;
    return result;
  }

  getBurnedBalance(toString = true) {
    return toString ? this.burnedBalance.toString() : this.burnedBalance;
  }

  getBalance(address, toString = true) {
    if (typeof this.balances[address] === 'bigint')
      return toString ? this.balances[address].toString() : this.balances[address];
    return toString ? '0' : 0n;
  }

  recalculateBalances() {
    this.startBalances();
    if (this.currencyMode) for (const block of this.chain) this.updateBalance(block);
  }

  getChainLength() {
    const previousBlock = this.getLatestBlock();
    return previousBlock.index;
  }

  getChainValue(index) {
    if (!this.chain[index]) throw new Error("Chain data don't exist!");
    return this.chain[index].get();
  }

  getChainData(index) {
    return this.chain[index]?.get() ?? null;
  }

  getAllChainData() {
    return this.chain.map((block) => block.get());
  }

  exportChain(startIndex = 0, endIndex = null) {
    const end = endIndex !== null ? endIndex : this.chain.length - 1;
    if (startIndex < 0 || end >= this.chain.length || startIndex > end)
      throw new Error('Invalid startIndex or endIndex range.');

    return this.chain.slice(startIndex, end + 1).map((b) => b.exportBlock());
  }

  importChain(chain) {
    this.chain = chain.map((seValue) => {
      const { value } = this.#parser.deserializeDeep(seValue, 'object');
      return this.#createBlockInstance({ ...value });
    });

    this.recalculateBalances();

    const isValid = this.isValid();
    if (isValid === null) throw new Error('The data chain is null or corrupted.');
    if (!isValid) throw new Error('The data chain is invalid or corrupted.');
  }
}

export default TinyChainInstance;
