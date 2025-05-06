// @ts-nocheck
import { TinyPromiseQueue } from 'tiny-essentials';
import { EventEmitter } from 'events';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

import TinyChainBlock from './Block.mjs';

class TinyChainInstance {
  /**
   * Important instance used to make event emitter.
   * @type {EventEmitter}
   */
  #events = new EventEmitter();

  /**
   * Emits an event with optional arguments to all system emit.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   */
  #emit(event, ...args) {
    this.#events.emit(event, ...args);
  }

  /**
   * @typedef {(...args: any[]) => void} ListenerCallback
   * A generic callback function used for event listeners.
   */

  /**
   * Sets the maximum number of listeners for the internal event emitter.
   *
   * @param {number} max - The maximum number of listeners allowed.
   */
  setMaxListeners(max) {
    this.#events.setMaxListeners(max);
  }

  /**
   * Emits an event with optional arguments.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   * @returns {boolean} `true` if the event had listeners, `false` otherwise.
   */
  emit(event, ...args) {
    return this.#events.emit(event, ...args);
  }

  /**
   * Registers a listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  on(event, listener) {
    this.#events.on(event, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for once.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  once(event, listener) {
    this.#events.once(event, listener);
    return this;
  }

  /**
   * Removes a listener from the specified event.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  off(event, listener) {
    this.#events.off(event, listener);
    return this;
  }

  /**
   * Alias for `on`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The callback to register.
   * @returns {this} The current class instance (for chaining).
   */
  addListener(event, listener) {
    this.#events.addListener(event, listener);
    return this;
  }

  /**
   * Alias for `off`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  removeListener(event, listener) {
    this.#events.removeListener(event, listener);
    return this;
  }

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

  #createGenesisBlock() {
    return this.#createBlockInstance({
      index: 0n,
      previousHash: '0',
      data: [
        {
          timestamp: Date.now(),
          address: '0',
          payload: 'Genesis Block',
          gasLimit: 0n,
          gasUsed: 0n,
          baseFeePerGas: 0n,
          maxFeePerGas: 0n,
          maxPriorityFeePerGas: 0n,
          miner: null,
          hash: null,
        },
      ],
    });
  }

  hasGenesisBlock() {
    if (this.chain.length === 0) return false;
    const firstBlock = this.chain[0];
    return (
      firstBlock.index === 0n &&
      firstBlock.previousHash === '0' &&
      firstBlock[0] &&
      firstBlock[0].address === '0'
    );
  }

  burnedBalance = BigInt(0);
  chain = [];

  constructor({
    transferGas = 15000, // symbolic per transfer, varies in real EVM
    baseFeePerGas = 21000,
    priorityFeeDefault = 2,
    difficulty = 1,
    payloadString = true,
    currencyMode = false,
    payloadMode = false,
    initialReward = 15000000000000000000,
    halvingInterval = 100,
    lastBlockReward = 1000,
    initialBalances = {},
    admins = [],
  } = {}) {
    this.#payloadString = payloadString;
    this.admins = new Set(admins);
    this.currencyMode = currencyMode;
    this.payloadMode = payloadMode;

    this.transferGas = BigInt(transferGas);
    this.baseFeePerGas = BigInt(baseFeePerGas); // initial base value Fee in gwei
    this.priorityFeeDefault = BigInt(priorityFeeDefault); // default priority in gwei
    this.difficulty = BigInt(difficulty);
    this.initialReward = BigInt(initialReward);
    this.halvingInterval = BigInt(halvingInterval);
    this.lastBlockReward = BigInt(lastBlockReward);

    if (currencyMode) this.initialBalances = initialBalances;
    this.startBalances();
  }

  #init() {
    if (this.chain.length > 0)
      throw new Error('Blockchain already initialized with a genesis block');
    const block = this.#createGenesisBlock();
    this.chain.push(block);
    return block;
  }

  async init() {
    return this.#queue.enqueue(async () => {
      const block = this.#init();
      this.#emit('Initialized', block);
    });
  }

  async initAsync() {
    return this.#queue.enqueue(async () => {
      const block = this.#init();
      this.#emit('Initialized', block);
    });
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

  #isValidBlock(current, previous) {
    if (!current) return null;
    if (current.hash !== current.calculateHash()) return false;
    if (previous && current.previousHash !== previous.hash) return false;
    return true;
  }

  isValid(startIndex = 0, endIndex = null) {
    const end = endIndex ?? this.chain.length - 1;

    for (let i = Math.max(startIndex, 1); i <= end; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      const result = this.#isValidBlock(current, previous);
      if (!result) return result;
    }

    return true;
  }

  isValidNewBlock(newBlock) {
    return this.#isValidBlock(newBlock, this.getLatestBlock());
  }

  getCurrentReward() {
    const height = this.getChainLength();
    if (height > this.lastBlockReward) return 0n;
    const halvings = height / this.halvingInterval;
    const reward = this.initialReward / 2n ** halvings;
    return reward > 0n ? reward : 0n;
  }

  createBlock(execAddress, payloadData = '', transfers = [], gasOptions = {}) {
    if (typeof execAddress !== 'string')
      throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);

    if (execAddress.trim().length === 0)
      throw new Error('Invalid address: address string cannot be empty or only whitespace');

    const reward = this.currencyMode ? this.getCurrentReward() : 0n;
    const {
      gasLimit = 50000n,
      maxFeePerGas = 200n,
      maxPriorityFeePerGas = this.priorityFeeDefault,
    } = gasOptions;

    const gasUsed = this.currencyMode ? this.estimateGasUsed(transfers, payloadData) : 0n;
    if (gasUsed > gasLimit)
      throw new Error(`Gas limit exceeded: used ${gasUsed} > limit ${gasLimit}`);

    return this.#createBlockInstance({
      data: [
        {
          transfers,
          address: execAddress,
          payload: payloadData,
          gasLimit: this.currencyMode ? gasLimit : 0n,
          gasUsed,
          baseFeePerGas: this.currencyMode ? this.baseFeePerGas : 0n,
          maxFeePerGas: this.currencyMode ? maxFeePerGas : 0n,
          maxPriorityFeePerGas: this.currencyMode ? maxPriorityFeePerGas : 0n,
          miner: null,
          hash: null,
        },
      ],
      difficulty: this.difficulty,
      reward,
    });
  }

  mineBlock(minerAddress, newBlock) {
    return this.#queue.enqueue(async () => {
      const mineNow = async () => {
        const previousBlock = this.getLatestBlock();
        const result = await newBlock.mine(minerAddress, {
          previousHash: previousBlock.hash,
          index: previousBlock.index + 1n,
        });

        if (!result.success) throw new Error('Block mining failed');
        const isValid = this.isValidNewBlock(newBlock);
        if (!isValid) throw new Error('Block mining invalid');

        if (this.currencyMode || this.payloadMode) this.updateBalance(newBlock);
        this.chain.push(newBlock);
        this.#emit('NewBlock', newBlock);
        return newBlock;
      };
      return mineNow();
    });
  }

  getFirstBlock() {
    return this.getChainBlock(0);
  }

  getLatestBlock() {
    return this.getChainBlock(this.chain.length - 1);
  }

  startBalances() {
    this.balances = {};
    this.#emit('BalancesInitialized', this.balances);
    if (this.currencyMode) {
      for (const [address, balance] of Object.entries(this.initialBalances)) {
        this.balances[address] = BigInt(balance);
        this.#emit('BalanceStarted', address, this.balances[address]);
      }
    }
  }

  updateBalance(block) {
    const reward = block.reward;
    const minerAddress = block.miner;
    if (typeof reward !== 'bigint')
      throw new Error(`Invalid reward: expected a BigInt, got "${typeof reward}"`);
    if (typeof minerAddress !== 'string' && minerAddress !== null)
      throw new Error(
        `Invalid minerAddress: expected a string or null, got "${typeof minerAddress}"`,
      );

    if (Array.isArray(block.data)) {
      let totalGasCollected = 0n;
      for (const data of block.data) {
        const execAddress = data.address;
        if (typeof execAddress !== 'string')
          throw new Error(`Invalid address: expected a string, got "${typeof execAddress}"`);
        if (execAddress.length < 1) return;

        if (this.currencyMode) {
          const transfers = data.transfers;
          const isAdmin = this.admins.has(execAddress);
          if (Array.isArray(transfers)) {
            for (const { from, to, amount } of transfers) {
              if (
                typeof from !== 'string' ||
                typeof to !== 'string' ||
                from.length < 1 ||
                to.length < 1
              )
                throw new Error('Invalid from/to address!');

              if (!isAdmin && from !== execAddress)
                throw new Error(`Non-admins can only send their own balance.`);

              if (this.balances[from] < amount)
                throw new Error(`Insufficient balance for user "${from}" (needs ${amount})`);
            }
          }

          let totalAmount = 0n;
          if (Array.isArray(transfers)) for (const tx of transfers) totalAmount += tx.amount;

          if (data.gasUsed > data.gasLimit)
            throw new Error(
              `Gas limit exceeded: used ${data.gasUsed} > limit ${data.gasLimit} for sender "${execAddress}"`,
            );

          const baseFeePerGas = data.baseFeePerGas;
          const maxPriorityFeePerGas = data.maxPriorityFeePerGas;
          const maxFeePerGas = data.maxFeePerGas; // user sets this

          const effectiveGasPrice = baseFeePerGas + maxPriorityFeePerGas;
          const gasPricePaid = effectiveGasPrice > maxFeePerGas ? maxFeePerGas : effectiveGasPrice;

          const gasUsed = data.gasUsed;
          const totalFee = gasUsed * gasPricePaid;

          if (!this.balances[execAddress]) {
            this.balances[execAddress] = 0n;
            this.#emit('BalanceStarted', execAddress, this.balances[execAddress]);
          }
          const isSufficientBalance = this.balances[execAddress] >= totalFee ? true : false;

          if (isSufficientBalance) {
            totalGasCollected += totalFee;
            this.balances[execAddress] -= totalFee;
          } else {
            totalGasCollected += this.balances[execAddress];
            this.balances[execAddress] = 0n;
          }

          if (isSufficientBalance) {
            for (const { from, to, amount } of transfers) {
              if (!this.balances[from]) {
                this.balances[from] = 0n;
                this.#emit('BalanceStarted', from, this.balances[from]);
              }
              if (!this.balances[to]) {
                this.balances[to] = 0n;
                this.#emit('BalanceStarted', to, this.balances[to]);
              }
              this.balances[from] -= amount;
              this.balances[to] += amount;
            }
          }

          this.#emit('BalanceUpdated', {
            transfers,
            address: execAddress,
            isAdmin,
            isSufficientBalance,
            totalAmount,
            totalFee,
          });
        }

        if (this.payloadMode) this.#emit('Payload', execAddress, data.payload);
      }

      const existsMiner = typeof minerAddress === 'string' && minerAddress.length > 0;
      if (existsMiner) {
        if (!this.balances[minerAddress]) {
          this.balances[minerAddress] = 0n;
          this.#emit('BalanceStarted', minerAddress, this.balances[minerAddress]);
        }
        this.balances[minerAddress] += reward + totalGasCollected;
      } else this.burnedBalance = reward + totalGasCollected;

      this.#emit('MinerBalanceUpdated', {
        totalGasCollected,
        address: existsMiner ? minerAddress : null,
        reward,
      });
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
    if (this.currencyMode || this.payloadMode)
      for (const block of this.chain) this.updateBalance(block);
    this.#emit('BalanceRecalculated', this.balances);
  }

  getChainLength() {
    const previousBlock = this.getLatestBlock();
    return previousBlock.index;
  }

  getChainBlock(index) {
    if (!this.chain[index]) throw new Error(`The chain data ${index} don't exist!`);
    return this.chain[index];
  }

  getChainBlockTx(index, tx) {
    return this.getChainBlock(index).getTx(tx);
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
    this.#emit('ImportChain', this.chain);
  }

  /**
   * Returns the base fee per gas (in gwei).
   * @returns {bigint}
   */
  getBaseFeePerGas() {
    return this.baseFeePerGas;
  }

  /**
   * Returns the default priority fee (in gwei).
   * @returns {bigint}
   */
  getDefaultPriorityFee() {
    return this.priorityFeeDefault;
  }

  /**
   * Returns the current transfer gas cost per transaction.
   * @returns {bigint}
   */
  getTransferGas() {
    return this.transferGas;
  }

  /**
   * Returns the chain difficulty.
   * @returns {bigint}
   */
  getDifficulty() {
    return this.difficulty;
  }

  /**
   * Returns the initial reward per block.
   * @returns {bigint}
   */
  getInitialReward() {
    return this.initialReward;
  }

  /**
   * Returns the halving interval.
   * @returns {bigint}
   */
  getHalvingInterval() {
    return this.halvingInterval;
  }

  /**
   * Returns the last block reward index.
   * @returns {bigint}
   */
  getLastBlockReward() {
    return this.lastBlockReward;
  }

  /**
   * Returns true if the blockchain is in currency mode.
   * @returns {boolean}
   */
  isCurrencyMode() {
    return this.currencyMode;
  }

  /**
   * Returns true if the blockchain is in payload mode.
   * @returns {boolean}
   */
  isPayloadMode() {
    return this.payloadMode;
  }

  /**
   * Returns a list of all admin addresses.
   * @returns {string[]}
   */
  getAdmins() {
    return Array.from(this.admins);
  }

  /**
   * Returns true if payloads are stored as string.
   * @returns {boolean}
   */
  isPayloadString() {
    return this.#payloadString;
  }
}

export default TinyChainInstance;
