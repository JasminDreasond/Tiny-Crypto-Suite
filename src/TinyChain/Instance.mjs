import { TinyPromiseQueue } from 'tiny-essentials';
import { EventEmitter } from 'events';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

import TinyChainBlock from './Block.mjs';

/**
 * A mapping of addresses to their balances.
 *
 * Each key in this object represents an address (usually a string),
 * and the corresponding value is a `bigint` representing the starting balance
 * for that address in the blockchain.
 *
 * @example
 * {
 *   alice: 1000000000n,
 *   bob: 1000000000n,
 *   charlie: 1000000000n,
 *   adminUser: 1000000000n
 * }
 *
 * @typedef {Object.<string, bigint>} Balances
 */

/**
 * Represents the configuration for gas usage and fee settings in a blockchain block.
 * This config is used to define the gas-related parameters when creating or processing a block.
 * These values are essential for controlling the transaction cost and prioritization of block inclusion.
 *
 * @typedef {Object} GasConfig
 * @property {bigint} [gasLimit=50000n] - The maximum allowed gas usage for the block (defaults to 50,000).
 * @property {bigint} [maxFeePerGas=200n] - The maximum fee per gas unit for the block (defaults to 200).
 * @property {bigint} [maxPriorityFeePerGas=this.priorityFeeDefault] - The priority fee per gas unit (defaults to the default value).
 */

/**
 * Represents a complete blockchain instance, managing block creation, mining,
 * validation, and balance tracking in optional currency and payload modes.
 *
 * This class handles a dynamic and extensible blockchain environment with gas fee mechanics,
 * custom payloads, transfer restrictions, admin controls, halving logic, and export/import capabilities.
 *
 * @class
 * @beta
 */
class TinyChainInstance {
  /** @typedef {import('./Block.mjs').Transaction} Transaction */
  /** @typedef {import('./Block.mjs').TransactionData} TransactionData */
  /** @typedef {import('./Block.mjs').GetTransactionData} GetTransactionData */

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

  /**
   * Checks whether the blockchain has a valid genesis block.
   *
   * A genesis block is identified by having:
   * - index equal to 0n
   * - previousHash equal to `'0'`
   * - at least one data entry
   * - the first data entry's `address` equal to `'0'`
   *
   * @returns {boolean} `true` if a valid genesis block is present, otherwise `false`.
   */
  hasGenesisBlock() {
    if (this.chain.length === 0) return false;
    const firstBlock = this.getFirstBlock();
    return (
      firstBlock.index === 0n &&
      firstBlock.previousHash === '0' &&
      firstBlock.data[0] &&
      firstBlock.data[0].address === '0'
    );
  }

  /** @type {TinyChainBlock[]} */
  chain = [];

  /**
   * Constructs a new blockchain instance with optional configuration parameters.
   *
   * This constructor initializes core parameters of the blockchain, including gas costs,
   * difficulty, reward system, and modes (currency/payload). It also sets up the initial
   * balances and admin list. If `currencyMode` is enabled, initial balances will be
   * registered immediately.
   *
   * @param {Object} [options] - Configuration options for the blockchain instance.
   * @param {string|number|bigint} [options.transferGas=15000] - Fixed gas cost per transfer operation (symbolic).
   * @param {string|number|bigint} [options.baseFeePerGas=21000] - Base gas fee per unit (in gwei).
   * @param {string|number|bigint} [options.priorityFeeDefault=2] - Default priority tip per gas unit (in gwei).
   * @param {string|number|bigint} [options.difficulty=1] - Difficulty for proof-of-work or validation cost.
   * @param {boolean} [options.payloadString=true] - If true, treats payloads as strings.
   * @param {boolean} [options.currencyMode=false] - Enables balance tracking and gas economics.
   * @param {boolean} [options.payloadMode=false] - Enables payload execution mode for blocks.
   * @param {string|number|bigint} [options.initialReward=15000000000000000000] - Reward for the genesis block or first mining.
   * @param {string|number|bigint} [options.halvingInterval=100] - Block interval for reward halving logic.
   * @param {string|number|bigint} [options.lastBlockReward=1000] - Reward for the last mined block.
   * @param {Balances} [options.initialBalances={}] - Optional mapping of initial addresses to balances.
   * @param {string[]} [options.admins=[]] - List of admin addresses granted elevated permissions.
   */
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
    /**
     * Whether the payload should be stored as a string or not.
     * Controls the serialization behavior of block payloads.
     *
     * @type {boolean}
     */
    this.#payloadString = payloadString;

    /**
     * A set of administrator addresses with elevated privileges.
     *
     * @type {Set<string>}
     */
    this.admins = new Set(admins);

    /**
     * Enables or disables currency mode, where balances are tracked.
     *
     * @type {boolean}
     */
    this.currencyMode = currencyMode;

    /**
     * Enables or disables payload mode, which allows block data to carry payloads.
     *
     * @type {boolean}
     */
    this.payloadMode = payloadMode;

    /**
     * The symbolic gas cost applied per transfer operation.
     *
     * @type {bigint}
     */
    this.transferGas = BigInt(transferGas);

    /**
     * The base fee per unit of gas, similar to Ethereum's `baseFeePerGas`.
     *
     * @type {bigint}
     */
    this.baseFeePerGas = BigInt(baseFeePerGas);

    /**
     * The default priority fee (tip) per gas unit offered by transactions.
     *
     * @type {bigint}
     */
    this.priorityFeeDefault = BigInt(priorityFeeDefault);

    /**
     * The mining difficulty, used to simulate block validation complexity.
     *
     * @type {bigint}
     */
    this.difficulty = BigInt(difficulty);

    /**
     * The initial block reward.
     *
     * @type {bigint}
     */
    this.initialReward = BigInt(initialReward);

    /**
     * The number of blocks after which the mining reward is halved.
     *
     * @type {bigint}
     */
    this.halvingInterval = BigInt(halvingInterval);

    /**
     * The reward of the last mined block, used for tracking reward evolution.
     *
     * @type {bigint}
     */
    this.lastBlockReward = BigInt(lastBlockReward);

    if (currencyMode) {
      /**
       * The initial balances of accounts, only used if `currencyMode` is enabled.
       *
       * @type {Balances}
       */
      this.initialBalances = initialBalances;
    }

    /**
     * The `balances` object, where the key is the address (string)
     * and the value is the balance (bigint) of that address.
     *
     * @type {Balances}
     */
    this.balances = {};
    this.startBalances();
  }

  /**
   * Initializes the blockchain by creating and pushing the genesis block.
   *
   * This method must be called only once. It ensures the blockchain is empty
   * before creating the genesis block. If the chain already contains blocks,
   * an error is thrown. The created genesis block is added to the chain and returned.
   *
   * @returns {TinyChainBlock} The genesis block that was created and added to the chain.
   * @throws {Error} If the blockchain already contains a genesis block.
   *
   */
  #init() {
    if (this.chain.length > 0)
      throw new Error('Blockchain already initialized with a genesis block');
    const block = this.#createGenesisBlock();
    this.chain.push(block);
    return block;
  }

  /**
   * Asynchronously initializes the blockchain instance by creating the genesis block.
   *
   * This method wraps the internal initialization logic in a queue to ensure
   * exclusive access during the setup phase. It emits an `Initialized` event
   * once the genesis block has been created and added to the chain.
   *
   * @returns {Promise<void>} A promise that resolves once initialization is complete.
   *
   * @emits Initialized - When the genesis block is successfully created and added.
   */
  async init() {
    return this.#queue.enqueue(async () => {
      const block = this.#init();
      this.#emit('Initialized', block);
    });
  }

  /**
   * Creates a new instance of a block with the given options.
   *
   * This method wraps the creation of a `TinyChainBlock`, automatically injecting
   * internal configuration such as `payloadString` and `parser`, and merging any
   * additional options provided by the caller.
   *
   * @param {Object} options - Additional block options to override or extend defaults.
   * @returns {TinyChainBlock} A new instance of the TinyChainBlock.
   *
   */
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
   * @param {Transaction[]} transfers - List of transfers (e.g., token or balance movements).
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
      // @ts-ignore
      dataGas += serialized[i] === 0 ? ZERO_BYTE_COST : NONZERO_BYTE_COST;
    }

    // Transfer gas cost (symbolic)
    const transferCount = Array.isArray(transfers) ? BigInt(transfers.length) : 0n;
    const transfersGas = transferCount * this.transferGas;

    return dataGas + transfersGas;
  }

  /**
   * Validates a single block against its expected hash and optionally the previous block.
   *
   * A block is considered valid if:
   * - It exists
   * - Its stored hash matches its recalculated hash
   * - If a previous block is provided, its `previousHash` matches the hash of that block
   *
   * @param {TinyChainBlock} current - The block to validate.
   * @param {TinyChainBlock|null} previous - The previous block in the chain (optional).
   * @returns {boolean|null} Returns `true` if valid, `false` if invalid, or `null` if block is missing.
   *
   */
  #isValidBlock(current, previous) {
    if (!current) return null;
    if (current.hash !== current.calculateHash()) return false;
    if (previous && current.previousHash !== previous.hash) return false;
    return true;
  }

  /**
   * Validates the blockchain from a starting to an ending index.
   *
   * It checks whether each block has a valid hash and that each block correctly references the previous one.
   * Skips the genesis block by default and starts from index 1 unless a different start is provided.
   *
   * @param {number} [startIndex=0] - The starting index to validate from (inclusive).
   * @param {number|null} [endIndex=null] - The ending index to validate up to (inclusive). Defaults to the last block.
   * @returns {boolean|null} Returns `true` if the chain is valid, `false` or `null` otherwise.
   */
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

  /**
   * Checks if a new block is valid in relation to the latest block in the chain.
   *
   * This is typically used before appending a new block to ensure integrity.
   *
   * @param {TinyChainBlock} newBlock - The new block to validate.
   * @returns {boolean|null} Returns `true` if the new block is valid, otherwise `false` or `null`.
   */
  isValidNewBlock(newBlock) {
    return this.#isValidBlock(newBlock, this.getLatestBlock());
  }

  /**
   * Calculates the current block reward based on the chain height and halving intervals.
   *
   * The reward starts at `initialReward` and is halved every `halvingInterval` blocks.
   * If the chain height exceeds the reward threshold, the reward becomes zero.
   *
   * @returns {bigint} The current block reward in the smallest unit of currency (e.g., wei, satoshis).
   *                    Returns `0n` if the reward has been exhausted.
   */
  getCurrentReward() {
    const height = this.getChainLength();
    if (height > this.lastBlockReward) return 0n;
    const halvings = height / this.halvingInterval;
    const reward = this.initialReward / 2n ** halvings;
    return reward > 0n ? reward : 0n;
  }

  /**
   * Creates a new block for the blockchain with the provided transaction data and gas options.
   *
   * The method will validate the address, estimate the gas used for the transactions, and ensure that the gas
   * limit is not exceeded before creating the block. It also includes reward information if `currencyMode` is enabled.
   *
   * @param {string} execAddress - The address that is executing the block, typically the transaction sender.
   * @param {string} [payloadData=''] - The data to be included in the block's payload. Default is an empty string.
   * @param {Array<Transaction>} [transfers=[]] - The list of transfers (transactions) to be included in the block.
   * @param {GasConfig} [gasOptions={}] - Optional gas-related configuration.
   *
   * @returns {TinyChainBlock} The newly created block instance with all the relevant data.
   *
   * @throws {Error} Throws an error if the `execAddress` is invalid or if the gas limit is exceeded.
   */
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

  /**
   * Mines a new block and adds it to the blockchain after validating and updating balances.
   *
   * This method will:
   * - Validate the block by checking its correctness using the `isValidNewBlock()` method.
   * - Update balances if `currencyMode` or `payloadMode` is enabled.
   * - Add the mined block to the blockchain and emit an event for the new block.
   *
   * @param {string} minerAddress - The address of the miner who is mining the block.
   * @param {TinyChainBlock} newBlock - The new block instance to be mined.
   *
   * @emits NewBlock - When the new block is added.
   *
   * @returns {Promise<TinyChainBlock>} A promise that resolves to the mined block once it has been added to the blockchain.
   *
   * @throws {Error} Throws an error if the mining process fails, or if the block is invalid.
   */
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

  /**
   * Adds a pre-mined block to the blockchain after validating it and updating balances.
   *
   * This method will:
   * - Validate the block by checking its hash, linkage and structure via `isValidNewBlock()`.
   * - Update account balances if `currencyMode` or `payloadMode` is enabled.
   * - Append the validated block to the blockchain and emit the `NewBlock` event.
   *
   * @param {TinyChainBlock} minedBlock - The already mined block to be added to the blockchain.
   *
   * @emits NewBlock - When the new block is added.
   *
   * @returns {Promise<TinyChainBlock>} A promise that resolves to the block once it has been added.
   *
   * @throws {Error} Throws an error if the block is invalid or balance update fails.
   */
  addMinedBlock(minedBlock) {
    return this.#queue.enqueue(async () => {
      const isValid = this.isValidNewBlock(minedBlock);
      if (!isValid) throw new Error('Invalid block cannot be added to the chain.');

      if (this.currencyMode || this.payloadMode) this.updateBalance(minedBlock);
      this.chain.push(minedBlock);
      this.#emit('NewBlock', minedBlock);
      return minedBlock;
    });
  }

  /**
   * Gets the first block in the blockchain.
   *
   * This method retrieves the first block from the blockchain by calling `getChainBlock(0)`.
   *
   * @returns {TinyChainBlock} The first block in the blockchain.
   */
  getFirstBlock() {
    return this.getChainBlock(0);
  }

  /**
   * Gets the latest block in the blockchain.
   *
   * This method retrieves the most recent block added to the blockchain by calling `getChainBlock(chain.length - 1)`.
   *
   * @returns {TinyChainBlock} The latest block in the blockchain.
   */
  getLatestBlock() {
    return this.getChainBlock(this.chain.length - 1);
  }

  /**
   * Initializes the `balances` object and emits events related to balance setup.
   *
   * This method resets the internal `balances` object to an empty state and emits
   * a `BalancesInitialized` event. If `currencyMode` is active, it will populate
   * the `balances` from the `initialBalances` mapping, converting all balances to BigInt,
   * and emit a `BalanceStarted` event for each initialized address.
   *
   * @emits BalancesInitialized - When the balances object is reset.
   * @emits BalanceStarted - For each address initialized when in currency mode.
   */
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

  /**
   * Updates the balances of addresses involved in the block, including gas fees and transfers.
   *
   * This method handles updating the balances for the addresses involved in the block's transactions.
   * It checks for sufficient balance, validates transactions, and applies the gas fees.
   * If the block includes a miner address, it adds the block reward and the gas collected to the miner's balance.
   *
   * @param {TinyChainBlock} block - The block whose balances need to be updated.
   * @param {Balances} [balances] - A mapping of addresses to their balances.
   * @param {boolean} [emitEvents=true] - If you need to send events.
   *
   * @emits BalanceStarted - For each address initialized when in currency mode.
   * @emits BalanceUpdated - For each address updated when in currency mode.
   * @emits Payload - For each payload executed when in payload mode.
   * @emits MinerBalanceUpdated - For each miner address updated when in currency mode.
   *
   * @throws {Error} Throws an error if:
   * - The reward is not a valid `BigInt`.
   * - The miner address is not a valid string or null.
   * - Any address in the transfers is invalid or has insufficient balance.
   * - The gas limit is exceeded.
   * - A transfer is made by a non-admin without being their own balance.
   * - Any other invalid operation occurs during balance updates.
   *
   * @returns {void} This method does not return any value.
   */
  updateBalance(block, balances = this.balances, emitEvents = true) {
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

              // @ts-ignore
              if (typeof balances[from] !== 'bigint' || balances[from] < amount)
                throw new Error(`Insufficient balance for user "${from}" (needs ${amount})`);
            }
          }

          let totalAmount = 0n;
          // @ts-ignore
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

          if (!balances[execAddress]) {
            balances[execAddress] = 0n;
            if (emitEvents) this.#emit('BalanceStarted', execAddress, balances[execAddress]);
          }
          const isSufficientBalance = balances[execAddress] >= totalFee ? true : false;

          if (isSufficientBalance) {
            totalGasCollected += totalFee;
            balances[execAddress] -= totalFee;
          } else {
            totalGasCollected += balances[execAddress];
            balances[execAddress] = 0n;
          }

          if (isSufficientBalance) {
            for (const { from, to, amount } of transfers) {
              if (!balances[from]) {
                balances[from] = 0n;
                if (emitEvents) this.#emit('BalanceStarted', from, balances[from]);
              }
              if (!balances[to]) {
                balances[to] = 0n;
                if (emitEvents) this.#emit('BalanceStarted', to, balances[to]);
              }
              // @ts-ignore
              balances[from] -= amount;
              // @ts-ignore
              balances[to] += amount;
            }
          }

          if (emitEvents)
            this.#emit('BalanceUpdated', {
              transfers,
              address: execAddress,
              isAdmin,
              isSufficientBalance,
              totalAmount,
              totalFee,
            });
        }

        if (this.payloadMode && emitEvents) this.#emit('Payload', execAddress, data.payload);
      }

      const totalReward = reward + totalGasCollected;
      const minerAddr =
        typeof minerAddress === 'string' && minerAddress.length > 0 ? minerAddress : '0';
      if (!balances[minerAddr]) {
        balances[minerAddr] = 0n;
        if (emitEvents) this.#emit('BalanceStarted', minerAddr, balances[minerAddr]);
      }
      balances[minerAddr] += totalReward;

      if (emitEvents)
        this.#emit('MinerBalanceUpdated', {
          totalGasCollected,
          reward,
          address: minerAddr,
          totalReward,
        });
    }
  }

  /**
   * Retrieves a copy of all balances in the system.
   *
   * This method returns an object mapping each address to its balance.
   * Only works when `currencyMode` is enabled.
   *
   * @returns {Balances} An object where each key is an address and the value is a `bigint` representing its balance.
   *
   * @throws {Error} Throws if `currencyMode` is disabled .
   */
  getBalances() {
    if (!this.currencyMode) throw new Error('Currency mode must be enabled.');
    /** @type {Balances} */
    const result = {};
    for (const [addr, amount] of Object.entries(this.balances)) result[addr] = amount;
    return result;
  }

  /**
   * Retrieves a snapshot of all balances as they were at a specific block index.
   *
   * This method reprocesses the blockchain from the genesis block up to (and including)
   * the specified index, recalculating all balances based on transfers and gas usage.
   *
   * Only works when `currencyMode` is enabled. Throws if the index is out of bounds.
   *
   * @param {number} [startIndex=0] - The starting index of the block range.
   * @param {number|null} [endIndex=null] - The ending index (inclusive); defaults to the last block.
   *
   * @returns {Balances} An object mapping each address to its `bigint` balance at the specified block.
   *
   * @throws {Error} Throws if `currencyMode` is disabled or if the index is invalid.
   */
  getBalancesAt(startIndex = 0, endIndex = null) {
    if (!this.currencyMode && !this.payloadMode)
      throw new Error('Currency mode or payload mode must be enabled.');
    const end = endIndex !== null ? endIndex : this.chain.length - 1;
    if (startIndex < 0 || end >= this.chain.length || startIndex > end)
      throw new Error('Invalid startIndex or endIndex range.');

    /** @type {Balances} */
    const balances = {};

    const chain = this.chain.slice(startIndex, end + 1);
    for (const block of this.chain) this.updateBalance(block, balances, false);

    return balances;
  }

  /**
   * Returns the total amount of burned currency in the system.
   *
   * This value represents the sum of rewards and gas fees that were not claimed by any miner (i.e., blocks without a miner address).
   *
   * @returns {bigint} The total burned balance as a `bigint`.
   *
   * @throws {Error} Throws if `currencyMode` is disabled .
   */
  getBurnedBalance() {
    return this.getBalance('0');
  }

  /**
   * Returns the current balance of a specific address.
   *
   * If the address does not exist in the balance record, it returns 0n.
   *
   * @param {string} address - The address whose balance should be retrieved.
   * @returns {bigint} The balance of the given address, or 0n if not found.
   *
   * @throws {Error} Throws if `currencyMode` is disabled.
   */
  getBalance(address) {
    if (!this.currencyMode) throw new Error('Currency mode must be enabled.');
    if (typeof this.balances[address] === 'bigint') return this.balances[address];
    return 0n;
  }

  /**
   * Recalculates all balances based on the current blockchain state.
   *
   * This method resets the `balances` using `startBalances()` and, if either
   * `currencyMode` or `payloadMode` is enabled, iterates through the entire
   * blockchain (`this.chain`) applying `updateBalance()` to each block to
   * recompute the balances. Finally, it emits a `BalanceRecalculated` event
   * with the updated balances.
   *
   * @emits BalanceRecalculated - When the balance recalculation process is complete.
   */
  recalculateBalances() {
    this.startBalances();
    if (this.currencyMode || this.payloadMode)
      for (const block of this.chain) this.updateBalance(block);
    this.#emit('BalanceRecalculated', this.balances);
  }

  /**
   * Returns the current length of the chain based on the latest block index.
   *
   * @returns {bigint} The index of the latest block, representing the chain length.
   */
  getChainLength() {
    const previousBlock = this.getLatestBlock();
    return previousBlock.index;
  }

  /**
   * Retrieves a block from the chain at a specific index.
   *
   * @param {number} index - The index of the block to retrieve.
   * @returns {TinyChainBlock} The block instance at the specified index.
   * @throws {Error} If the block at the given index does not exist.
   */
  getChainBlock(index) {
    if (!this.chain[index]) throw new Error(`The chain data ${index} don't exist!`);
    return this.chain[index];
  }

  /**
   * Retrieves a specific transaction from a block at a given index.
   *
   * @param {number} index - The index of the block.
   * @param {string} tx - The index of the transaction within the block.
   * @returns {TransactionData} The transaction object.
   */
  getChainBlockTx(index, tx) {
    return this.getChainBlock(index).getTx(tx);
  }

  /**
   * Returns all the data from the entire blockchain.
   *
   * Each block's raw data is returned as structured by its `get()` method.
   *
   * @returns {GetTransactionData[]} An array containing all blocks' data.
   */
  getAllChainData() {
    return this.chain.map((block) => block.get());
  }

  /**
   * Exports a slice of the blockchain for serialization or transfer.
   *
   * The method safely extracts and serializes blocks between two indices.
   *
   * @param {number} [startIndex=0] - The starting index of the block range.
   * @param {number|null} [endIndex=null] - The ending index (inclusive); defaults to the last block.
   * @returns {string[]} An array of exported block data.
   * @throws {Error} If indices are out of bounds or invalid.
   */
  exportChain(startIndex = 0, endIndex = null) {
    const end = endIndex !== null ? endIndex : this.chain.length - 1;
    if (startIndex < 0 || end >= this.chain.length || startIndex > end)
      throw new Error('Invalid startIndex or endIndex range.');

    return this.chain.slice(startIndex, end + 1).map((b) => b.exportBlock());
  }

  /**
   * Imports and rebuilds a blockchain from serialized block data.
   *
   * After import, balances are recalculated and the new chain is validated.
   *
   * @emits ImportChain - When the new chain is imported.
   *
   * @param {string[]} chain - The array of serialized blocks to import.
   * @throws {Error} If the imported chain is null, invalid, or corrupted.
   */
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
