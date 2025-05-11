import { Buffer } from 'buffer';
import { formatBytes, TinyPromiseQueue } from 'tiny-essentials';
import { EventEmitter } from 'events';
import TinyCryptoParser from '../lib/TinyCryptoParser.mjs';

import TinyChainEvents from './Events.mjs';
import TinyChainBlock from './Block.mjs';
import TinySecp256k1 from './Secp256k1/index.mjs';

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
 * @property {bigint} [maxPriorityFeePerGas=this.getDefaultPriorityFee()] - The priority fee per gas unit (defaults to the default value).
 */

/**
 * Represents the content payload to be inserted into a blockchain block.
 * This object contains the transaction data and its corresponding cryptographic signature.
 *
 * @typedef {Object} BlockContent
 * @property {TransactionData} data - The transaction data that describes the operation or transfer.
 * @property {Buffer|string} sig - A cryptographic signature verifying the authenticity of the transaction.
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
  /** @typedef {import('./Block.mjs').NewTransaction} NewTransaction */
  /** @typedef {import('./Block.mjs').Transaction} Transaction */
  /** @typedef {import('./Block.mjs').TransactionData} TransactionData */
  /** @typedef {import('./Block.mjs').GetTransactionData} GetTransactionData */
  /** @typedef {import('./Block.mjs').BlockInitData} BlockInitData */

  #signer;
  #blockSizeLimit;
  #payloadSizeLimit;
  #blockContentSizeLimit;

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

  /**
   * Checks whether the blockchain has a valid genesis block.
   *
   * A genesis block is identified by having:
   * - index equal to 0n
   * - prevHash equal to `'0'`
   * - at least one data entry
   * - the first data entry's `address` equal to `'0'`
   *
   * @returns {boolean} `true` if a valid genesis block is present, otherwise `false`.
   */
  hasGenesisBlock() {
    if (this.#getChain().length === 0) return false;
    const firstBlock = this.getFirstBlock();
    return (
      firstBlock.index === 0n &&
      firstBlock.prevHash === '0' &&
      firstBlock.data[0] &&
      firstBlock.data[0].address === '0'
    );
  }

  /**
   * The tiny blockchain.
   *
   * @type {TinyChainBlock[]}
   */
  chain = [];

  /**
   * The initial balances of accounts, only used if `currencyMode` is enabled.
   *
   * @type {Balances}
   */
  initialBalances = {};

  /**
   * Validates and returns the internal balances object.
   * Throws an error if balances is not a plain object.
   *
   * @returns {Balances} A reference to the balances object if valid.
   * @throws {Error} If balances is not a plain object.
   */
  #getBalances() {
    if (typeof this.balances !== 'object' || this.balances === null || Array.isArray(this.balances))
      throw new Error('balances must be a plain object');
    return this.balances;
  }

  /**
   * Safely retrieves the current blockchain array.
   * Ensures that `this.chain` is a valid array before returning it.
   * If the internal `chain` property is corrupted or invalid, an error is thrown to prevent further logic failures.
   *
   * @returns {TinyChainBlock[]} The current blockchain as an array of TinyChainBlock instances.
   * @throws {Error} If `this.chain` is not an array.
   */
  #getChain() {
    if (!Array.isArray(this.chain)) throw new Error('chain must be an array');
    return this.chain;
  }

  /**
   * Constructs a new blockchain instance with optional configuration parameters.
   *
   * This constructor initializes core parameters of the blockchain, including gas costs,
   * difficulty, reward system, and modes (currency/payload). It also sets up the initial
   * balances and admin list. If `currencyMode` is enabled, initial balances will be
   * registered immediately.
   *
   * @param {Object} [options] - Configuration options for the blockchain instance.
   * @param {TinySecp256k1} [options.signer] - Signer instance for cryptographic operations.
   * @param {string|number|bigint} [options.chainId=0] - The chain ID.
   * @param {string|number|bigint} [options.transferGas=15000] - Fixed gas cost per transfer operation (symbolic).
   * @param {string|number|bigint} [options.baseFeePerGas=21000] - Base gas fee per unit (in gwei).
   * @param {string|number|bigint} [options.priorityFeeDefault=2] - Default priority tip per gas unit (in gwei).
   * @param {string|number|bigint} [options.diff=1] - Difficulty for proof-of-work or validation cost.
   * @param {boolean} [options.payloadString=true] - If true, treats payloads as strings.
   * @param {boolean} [options.currencyMode=false] - Enables balance tracking and gas economics.
   * @param {boolean} [options.payloadMode=false] - Enables payload execution mode for blocks.
   * @param {string|number|bigint} [options.initialReward=15000000000000000000n] - Reward for the genesis block or first mining.
   * @param {string|number|bigint} [options.halvingInterval=100] - Block interval for reward halving logic.
   * @param {string|number|bigint} [options.lastBlockReward=1000] - Reward for the last mined block.
   * @param {Balances} [options.initialBalances={}] - Optional mapping of initial addresses to balances.
   * @param {string[]} [options.admins=[]] - List of admin public keys granted elevated permissions.
   *
   * @param {number} [options.blockContentSizeLimit=-1] - Defines the maximum number of items allowed inside a single block's content.
   * A value of -1 disables the limit entirely.
   *
   * @param {number} [options.blockSizeLimit=-1] - Defines the total maximum size (in bytes) for an entire block.
   * A value of -1 disables the limit entirely.
   *
   * @param {number} [options.payloadSizeLimit=-1] - Sets the maximum allowed size (in bytes) for a transaction payload.
   * A value of -1 disables the limit entirely.
   *
   * @throws {Error} Throws an error if any parameter has an invalid type or value.
   */
  constructor({
    signer,
    chainId = 0,
    transferGas = 15000, // symbolic per transfer, varies in real EVM
    baseFeePerGas = 21000,
    priorityFeeDefault = 2,
    diff = 1,
    payloadString = true,
    currencyMode = false,
    payloadMode = false,
    initialReward = 15000000000000000000n,
    halvingInterval = 100,
    lastBlockReward = 1000,
    initialBalances = {},
    blockSizeLimit = -1,
    blockContentSizeLimit = -1,
    payloadSizeLimit = -1,
    admins = [],
  } = {}) {
    // Validation for each parameter
    if (typeof chainId !== 'bigint' && typeof chainId !== 'number' && typeof chainId !== 'string')
      throw new Error('Invalid type for chainId. Expected bigint, number, or string.');
    if (typeof signer !== 'object')
      throw new Error('Invalid type for signer. Expected a TinySecp256k1.');
    if (
      typeof transferGas !== 'bigint' &&
      typeof transferGas !== 'number' &&
      typeof transferGas !== 'string'
    )
      throw new Error('Invalid type for transferGas. Expected bigint, number, or string.');

    if (
      typeof blockContentSizeLimit !== 'number' ||
      Number.isNaN(blockContentSizeLimit) ||
      !Number.isFinite(blockContentSizeLimit) ||
      blockContentSizeLimit < -1
    )
      throw new Error('Invalid type for blockContentSizeLimit. Expected number with min value -1.');
    if (
      typeof blockSizeLimit !== 'number' ||
      Number.isNaN(blockSizeLimit) ||
      !Number.isFinite(blockSizeLimit) ||
      blockSizeLimit < -1
    )
      throw new Error('Invalid type for blockSizeLimit. Expected number with min value -1.');
    if (
      typeof payloadSizeLimit !== 'number' ||
      Number.isNaN(payloadSizeLimit) ||
      !Number.isFinite(payloadSizeLimit) ||
      payloadSizeLimit < -1
    )
      throw new Error('Invalid type for payloadSizeLimit. Expected number with min value -1.');

    if (
      typeof baseFeePerGas !== 'bigint' &&
      typeof baseFeePerGas !== 'number' &&
      typeof baseFeePerGas !== 'string'
    )
      throw new Error('Invalid type for baseFeePerGas. Expected bigint, number, or string.');
    if (
      typeof priorityFeeDefault !== 'bigint' &&
      typeof priorityFeeDefault !== 'number' &&
      typeof priorityFeeDefault !== 'string'
    )
      throw new Error('Invalid type for priorityFeeDefault. Expected bigint, number, or string.');
    if (typeof diff !== 'bigint' && typeof diff !== 'number' && typeof diff !== 'string')
      throw new Error('Invalid type for difficulty. Expected bigint, number, or string.');
    if (typeof payloadString !== 'boolean')
      throw new Error('Invalid type for payloadString. Expected boolean.');
    if (typeof currencyMode !== 'boolean')
      throw new Error('Invalid type for currencyMode. Expected boolean.');
    if (typeof payloadMode !== 'boolean')
      throw new Error('Invalid type for payloadMode. Expected boolean.');
    if (
      typeof initialReward !== 'bigint' &&
      typeof initialReward !== 'number' &&
      typeof initialReward !== 'string'
    )
      throw new Error('Invalid type for initialReward. Expected bigint, number, or string.');
    if (
      typeof halvingInterval !== 'bigint' &&
      typeof halvingInterval !== 'number' &&
      typeof halvingInterval !== 'string'
    )
      throw new Error('Invalid type for halvingInterval. Expected bigint, number, or string.');
    if (
      typeof lastBlockReward !== 'bigint' &&
      typeof lastBlockReward !== 'number' &&
      typeof lastBlockReward !== 'string'
    )
      throw new Error('Invalid type for lastBlockReward. Expected bigint, number, or string.');
    if (typeof initialBalances !== 'object' || initialBalances === null)
      throw new Error('Invalid type for initialBalances. Expected object.');

    if (!Array.isArray(admins)) throw new Error('Invalid type for admins. Expected array.');
    admins.forEach((admin, index) => {
      if (typeof admin !== 'string')
        throw new Error(`Invalid type for admin at index ${index}. Expected string.`);
    });

    /**
     * The signer instance used for cryptographic operations.
     * @type {TinySecp256k1}
     */
    this.#signer = signer;

    /**
     * Defines the maximum allowed size (in bytes) inside a single block's content.
     * This is typically used to prevent overly large block contents.
     *
     * @type {number}
     */
    this.#blockContentSizeLimit = blockContentSizeLimit;

    /**
     * Sets the maximum allowed size (in bytes) for a transaction payload.
     * Used to limit the data carried by each transaction to avoid abuse.
     *
     * @type {number}
     */
    this.#payloadSizeLimit = payloadSizeLimit;

    /**
     * Defines the total maximum size (in bytes) for an entire block.
     * This includes headers, content, and metadata.
     *
     * @type {number}
     */
    this.#blockSizeLimit = blockSizeLimit;

    /**
     * Whether the payload should be stored as a string or not.
     * Controls the serialization behavior of block payloads.
     *
     * @type {boolean}
     */
    this.#payloadString = payloadString;

    /**
     * A set of administrator public keys with elevated privileges.
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
     * The chain id applied per transfer operation.
     *
     * @type {bigint}
     */
    this.chainId = BigInt(chainId);

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
    this.diff = BigInt(diff);

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

    if (currencyMode) this.setInitialBalances(initialBalances);

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
   * Sets the initial balances for the system.
   *
   * This method updates the `initialBalances` with a new set of address-balance pairs.
   * It validates the input to ensure that each address is a valid string and each balance is a positive `bigint`.
   *
   * @emits InitialBalancesUpdated - Emitted when the initial balances are updated.
   *
   * @param {Balances} initialBalances - An object mapping addresses to their corresponding balances.
   * @throws {Error} Throws an error if any address is invalid or any balance is not a positive `bigint`.
   *
   * @returns {void}
   */
  setInitialBalances(initialBalances) {
    if (typeof initialBalances !== 'object' || initialBalances === null)
      throw new Error('Initial balances must be an object.');

    // Validate each address and balance
    for (const [address, balance] of Object.entries(initialBalances)) {
      // Validate address
      if (typeof address !== 'string' || address.trim().length === 0)
        throw new Error(`Invalid address: "${address}". Address must be a non-empty string.`);

      // Validate balance (should be a positive bigint)
      if (typeof balance !== 'bigint' || balance < 0n)
        throw new Error(
          `Invalid balance for address "${address}": expected a positive bigint, got "${typeof balance}".`,
        );
    }

    // Set the new initial balances
    this.initialBalances = initialBalances;

    // Emit the event
    this.#emit(TinyChainEvents.InitialBalancesUpdated, this.initialBalances);
  }

  /**
   * Gets the current initial balances configured in the system.
   *
   * This method returns the mapping of addresses to their initial balances as last set
   * by `setInitialBalances`. It ensures the returned data is a valid object.
   *
   * @returns {Balances} An object mapping addresses to their corresponding initial balances.
   * @throws {Error} Throws an error if the internal initialBalances is not a valid object.
   */
  getInitialBalances() {
    if (typeof this.initialBalances !== 'object' || this.initialBalances === null)
      throw new Error('Initial balances are not properly initialized.');
    return this.initialBalances;
  }

  /**
   * Initializes the blockchain by creating and pushing the genesis block.
   *
   * This method must be called only once. It ensures the blockchain is empty
   * before creating the genesis block. If the chain already contains blocks,
   * an error is thrown. The created genesis block is added to the chain and returned.
   *
   * @param {TinySecp256k1} [signer=this.#sender] - The address that is executing the block, typically the transaction sender.
   *
   * @returns {TinyChainBlock} The genesis block that was created and added to the chain.
   * @throws {Error} If the blockchain already contains a genesis block.
   *
   */
  #init(signer = this.#signer) {
    const chain = this.#getChain();
    if (chain.length > 0) throw new Error('Blockchain already initialized with a genesis block');

    const data = {
      transfers: [],
      address: signer.getPublicKeyHex(),
      addressType: signer.getType(),
      payload: 'Genesis Block',
      gasLimit: 0n,
      gasUsed: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
    };

    const sig = signer.signECDSA(this.#parser.serializeDeep(data), 'utf-8');

    const block = this.#createBlockInstance({
      index: 0n,
      prevHash: '0',
      baseFeePerGas: 0n,
      firstValidation: false,
      data: [data],
      sigs: [sig.toString('hex')],
    });
    chain.push(block);
    return block;
  }

  /**
   * Asynchronously initializes the blockchain instance by creating the genesis block.
   *
   * This method wraps the internal initialization logic in a queue to ensure
   * exclusive access during the setup phase. It emits an `Initialized` event
   * once the genesis block has been created and added to the chain.
   *
   * @param {TinySecp256k1} [signer=this.#sender] - The address that is executing the block, typically the transaction sender.
   *
   * @returns {Promise<void>} A promise that resolves once initialization is complete.
   *
   * @emits Initialized - When the genesis block is successfully created and added.
   */
  async init(signer = this.#signer) {
    return this.#queue.enqueue(async () => {
      const block = this.#init(signer);
      this.#emit(TinyChainEvents.Initialized, block);
    });
  }

  /**
   * Creates a new instance of a block with the given options.
   *
   * This method wraps the creation of a `TinyChainBlock`, automatically injecting
   * internal configuration such as `payloadString` and `parser`, and merging any
   * additional options provided by the caller.
   *
   * @param {BlockInitData} options - Additional block options to override or extend defaults.
   * @returns {TinyChainBlock} A new instance of the TinyChainBlock.
   *
   */
  #createBlockInstance(options) {
    return new TinyChainBlock({
      baseFeePerGas: this.isCurrencyMode() ? this.getBaseFeePerGas() : 0n,
      payloadString: this.#payloadString,
      parser: this.#parser,
      signer: this.#signer,
      chainId: this.getChainId(),
      ...options,
    });
  }

  /**
   * Simulates gas estimation for an Ethereum-like transaction.
   * Considers base cost, data size, and per-transfer cost.
   * @param {Transaction[]|NewTransaction[]} transfers - List of transfers (e.g., token or balance movements).
   * @param {any} payload - Data to be included in the transaction (e.g., contract call).
   * @returns {bigint}
   */
  estimateGasUsed(transfers, payload) {
    if (typeof payload !== 'undefined' && payload !== null && !Array.isArray(transfers))
      throw new Error(`"transfers" in data entry must be a array.`);
    if (this.#payloadString && typeof payload !== 'string')
      throw new Error(`"payload" in data entry must be a string.`);

    const ZERO_BYTE_COST = 4n;
    const NONZERO_BYTE_COST = 16n;

    // Serialize and calculate gas per byte (mimicking Ethereum rules)
    const serialized = this.#parser.serializeDeep(payload);
    let dataGas = 0n;
    for (let i = 0; i < serialized.length; i++) {
      // @ts-ignore
      dataGas += serialized[i] === 0 ? ZERO_BYTE_COST : NONZERO_BYTE_COST;
    }

    // Transfer gas cost (symbolic)
    const transferCount = Array.isArray(transfers) ? BigInt(transfers.length) : 0n;
    const transfersGas = transferCount * this.getTransferGas();

    return dataGas + transfersGas;
  }

  /**
   * Validates a single block against its expected hash and optionally the previous block.
   *
   * A block is considered valid if:
   * - It exists
   * - Its stored hash matches its recalculated hash
   * - If a previous block is provided, its `prevHash` matches the hash of that block
   *
   * @param {TinyChainBlock} current - The block to validate.
   * @param {TinyChainBlock|null} [previous] - The previous block in the chain (optional).
   * @returns {boolean|null} Returns `true` if valid, `false` if invalid, or `null` if block is missing.
   *
   */
  #isValidBlock(current, previous = null) {
    if (!current) return null;
    if (!(current instanceof TinyChainBlock))
      throw new Error('Current block is not a valid TinyChainBlock instance.');
    try {
      current.validateSig();
    } catch {
      return false;
    } finally {
      if (current.hash !== current.calculateHash()) return false;
      if (previous) {
        if (!(previous instanceof TinyChainBlock))
          throw new Error('Previous block is not a valid TinyChainBlock instance.');
        try {
          previous.validateSig();
        } catch {
          return false;
        } finally {
          if (current.prevHash !== previous.hash) return false;
        }
      }
    }
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
    const chain = this.#getChain();
    const end = endIndex ?? chain.length - 1;

    for (let i = Math.max(startIndex, 1); i <= end; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
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
   * @param {TinyChainBlock} [prevBlock=this.getLatestBlock()] - The prev block to validate.
   * @returns {boolean|null} Returns `true` if the new block is valid, otherwise `false` or `null`.
   */
  isValidNewBlock(newBlock, prevBlock = this.getLatestBlock()) {
    return this.#isValidBlock(newBlock, prevBlock);
  }

  /**
   * Checks whether the new block has a valid previous hash.
   *
   * This ensures the block references a previous block and is not the genesis block.
   *
   * @param {TinyChainBlock} newBlock - The block to check.
   * @returns {boolean} Returns `true` if the previous hash is valid, otherwise `false`.
   */
  existsPrevBlock(newBlock) {
    if (
      typeof newBlock.prevHash !== 'string' ||
      newBlock.prevHash.trim().length < 1 ||
      newBlock.prevHash === '0'
    )
      return false;
    return true;
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
    if (height > this.getLastBlockReward()) return 0n;
    const halvings = height / this.getHalvingInterval();
    const reward = this.getInitialReward() / 2n ** halvings;
    return reward > 0n ? reward : 0n;
  }

  /**
   * Validates the transaction content before inclusion in a block.
   * This method checks payload format, transfer structure, gas-related constraints,
   * and address validity. Throws detailed errors if any validation fails.
   *
   * @param {Object} [options={}] - Content data to be validated.
   * @param {string} [options.payload] - Raw payload data in string format. Required.
   * @param {Transaction[]|NewTransaction[]} [options.transfers] - List of transfers to be validated. Must be an array.
   * @param {bigint} [options.gasLimit] - Maximum allowed gas usage for the transaction.
   * @param {bigint} [options.maxFeePerGas] - The maximum total fee per unit of gas the sender is willing to pay.
   * @param {bigint} [options.maxPriorityFeePerGas] - The tip paid to miners per unit of gas.
   * @param {string} [options.address] - Sender address of the transaction.
   * @param {string} [options.addressType] - Type of address (e.g., 'user', 'contract'). Must be a non-empty string.
   *
   * @throws {Error} If payload is not a string.
   * @throws {Error} If transfers is not an array.
   * @throws {Error} If any gas parameter is not a BigInt.
   * @throws {Error} If address is not a string.
   * @throws {Error} If addressType is invalid.
   * @throws {Error} If gas used exceeds the provided gas limit.
   *
   * @returns {bigint} Returns the estimated gas used for the transaction.
   */
  validateContent({
    payload,
    transfers,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    address,
    addressType,
  } = {}) {
    if (typeof payload !== 'string') throw new Error('Payload must be a string');
    if (!Array.isArray(transfers)) throw new Error('Transfers must be an array');
    const gasUsed = this.isCurrencyMode() ? this.estimateGasUsed(transfers, payload) : 0n;

    if (
      typeof gasLimit !== 'bigint' ||
      typeof maxFeePerGas !== 'bigint' ||
      typeof maxPriorityFeePerGas !== 'bigint'
    )
      throw new Error('Gas parameters must be BigInt');

    if (typeof address !== 'string') throw new Error('Address value must be string');
    if (typeof addressType !== 'string' || addressType.length === 0)
      throw new Error('Invalid address type');

    if (gasUsed > gasLimit)
      throw new Error(`Gas limit exceeded: used ${gasUsed} > limit ${gasLimit}`);
    if (Array.isArray(transfers)) this.validateTransfers(address, addressType, transfers);
    return gasUsed;
  }

  /**
   * Creates a new block content for the blockchain with the provided transaction data and gas options.
   *
   * The method will validate the address, estimate the gas used for the transactions, and ensure that the gas
   * limit is not exceeded before creating the block. It also includes reward information if `currencyMode` is enabled.
   *
   * @param {Object} [options={}] - Block options.
   * @param {TinySecp256k1} [options.signer=this.#sender] - The address that is executing the block, typically the transaction sender.
   * @param {string} [options.payload=''] - The data to be included in the block's payload. Default is an empty string.
   * @param {Array<Transaction>} [options.transfers=[]] - The list of transfers (transactions) to be included in the block.
   * @param {GasConfig} [options.gasOptions={}] - Optional gas-related configuration.
   *
   * @return {BlockContent}
   * @throws {Error} Throws an error if the `execAddress` is invalid or if the gas limit is exceeded.
   */
  createBlockContent({
    signer = this.#signer,
    payload = '',
    transfers = [],
    gasOptions = {},
  } = {}) {
    if (!(signer instanceof TinySecp256k1))
      throw new Error('Invalid signer: expected TinySecp256k1-compatible object');
    const isCurrencyMode = this.isCurrencyMode();

    const {
      gasLimit = 50000n,
      maxFeePerGas = 200n,
      maxPriorityFeePerGas = this.getDefaultPriorityFee(),
    } = gasOptions;

    const address = signer.getPublicKeyHex();
    const addressType = signer.getType();

    const gasUsed = this.validateContent({
      payload,
      transfers,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      address,
      addressType,
    });

    const data = {
      transfers,
      address,
      addressType,
      payload,
      gasLimit: isCurrencyMode ? gasLimit : 0n,
      gasUsed,
      maxFeePerGas: isCurrencyMode ? maxFeePerGas : 0n,
      maxPriorityFeePerGas: isCurrencyMode ? maxPriorityFeePerGas : 0n,
    };

    const serialized = this.#parser.serializeDeep(data);
    if (typeof serialized !== 'string' || serialized.length === 0)
      throw new Error('Failed to serialize block content');

    const sig = signer.signECDSA(serialized, 'utf-8');
    return { data, sig };
  }

  /**
   * Creates a new blockchain block using the provided signed content payloads.
   *
   * This method aggregates multiple `BlockContent` entries—each containing transaction data and a corresponding signature—into a single block.
   * It includes optional reward data when the chain is operating in `currencyMode`, and computes the current difficulty setting (`diff`) at creation time.
   *
   * The block is finalized by calling an internal method that handles structural assembly and final consistency.
   *
   * @param {BlockContent[]} content - An array of signed block content objects, each containing transaction data and its signature.
   * @returns {TinyChainBlock} The newly created block instance with all aggregated data, ready to be appended to the chain.
   * @throws {Error}
   */
  createBlock(content) {
    if (!Array.isArray(content) || content.length === 0)
      throw new Error('Content must be a non-empty array of BlockContent');

    const isCurrencyMode = this.isCurrencyMode();
    const reward = isCurrencyMode ? this.getCurrentReward() : 0n;
    const dataList = [];
    const sigs = [];
    for (const [index, item] of content.entries()) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.data !== 'object' ||
        item.data === null
      )
        throw new Error(`Invalid BlockContent at index ${index}`);
      const { sig, data } = item;
      const gasUsed = this.validateContent(data);

      if (gasUsed !== data.gasUsed)
        throw new Error(`Gas used at index ${index} value does not match`);

      if (!Buffer.isBuffer(sig) && typeof sig !== 'string')
        throw new Error(`Signature at index ${index} must be a Buffer or hex string`);

      dataList.push(data);
      sigs.push(typeof sig === 'string' ? sig : sig.toString('hex'));
    }

    return this.#createBlockInstance({
      data: dataList,
      sigs,
      reward,
      diff: this.getDiff(),
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
          prevHash: previousBlock.hash,
          index: previousBlock.index + 1n,
        });

        if (!result.success) throw new Error('Block mining failed');
        const isValid = this.isValidNewBlock(newBlock);
        if (!isValid) throw new Error('Block mining invalid');

        if (this.isCurrencyMode() || this.isPayloadMode()) this.updateBalance(newBlock);
        this.#getChain().push(newBlock);
        this.#emit(TinyChainEvents.NewBlock, newBlock);
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

      if (this.isCurrencyMode() || this.isPayloadMode()) this.updateBalance(minedBlock);
      this.#getChain().push(minedBlock);
      this.#emit(TinyChainEvents.NewBlock, minedBlock);
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
    return this.getChainBlock(this.#getChain().length - 1);
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
    this.#emit(TinyChainEvents.BalancesInitialized, this.balances);
    if (this.isCurrencyMode()) {
      const balances = this.#getBalances();
      for (const [address, balance] of Object.entries(this.getInitialBalances())) {
        balances[address] = BigInt(balance);
        this.#emit(TinyChainEvents.BalanceStarted, address, balances[address]);
      }
    }
  }

  /**
   * Validates a list of transfers for a transaction.
   * Ensures that each transfer has valid 'from' and 'to' addresses,
   * the sender has enough balance, and non-admins can only transfer their own funds.
   *
   * @param {string} pubKey - The hex public key executing the transaction.
   * @param {string} addressType - The address type executing the transaction.
   * @param {NewTransaction[]} transfers - The list of transfers to validate.
   * @param {Balances} [balances] - A mapping of addresses to their balances.
   * @throws {Error} If the list is not an array, if any transfer is malformed,
   * or if the sender is unauthorized or lacks balance.
   */
  validateTransfers(pubKey, addressType, transfers, balances = this.#getBalances()) {
    const isAdmin = this.getAdmins().has(pubKey);
    const address = this.#signer.getAddress(Buffer.from(pubKey, 'hex'), addressType);

    if (!Array.isArray(transfers)) throw new Error('Transaction transfers must be an array.');
    for (const { from, to, amount } of transfers) {
      if (
        typeof from !== 'string' ||
        typeof to !== 'string' ||
        from.length < 1 ||
        to.length < 1 ||
        !this.#signer.validateAddress(from, 'guess').valid ||
        !this.#signer.validateAddress(to, 'guess').valid
      )
        throw new Error('Invalid from/to address!');

      if (!isAdmin && from !== address)
        throw new Error(`Non-admins can only send their own balance.`);

      // @ts-ignore
      if (typeof balances[from] !== 'bigint' || balances[from] < amount)
        throw new Error(`Insufficient balance for user "${from}" (needs ${amount})`);
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
  updateBalance(block, balances = this.#getBalances(), emitEvents = true) {
    const reward = block.reward;
    const minerAddress = block.miner;
    const baseFeePerGas = block.baseFeePerGas;
    const isMinerAddress = typeof minerAddress === 'string' && minerAddress.length > 0;

    if (isMinerAddress && !this.#signer.validateAddress(minerAddress, 'guess').valid)
      throw new Error('Invalid miner address!');
    if (typeof reward !== 'bigint')
      throw new Error(`Invalid reward: expected a BigInt, got "${typeof reward}"`);
    if (typeof baseFeePerGas !== 'bigint')
      throw new Error(`Invalid baseFeePerGas: expected a BigInt, got "${typeof baseFeePerGas}"`);
    if (typeof minerAddress !== 'string' && minerAddress !== null)
      throw new Error(
        `Invalid minerAddress: expected a string or null, got "${typeof minerAddress}"`,
      );

    if (Array.isArray(block.data)) {
      let totalGasCollected = 0n;
      for (const data of block.data) {
        if (typeof data.address !== 'string')
          throw new Error(`Invalid address: expected a string, got "${typeof data.address}"`);
        if (data.address.length < 1) return;

        const addressType = data.addressType;
        const execAddress = this.#signer.getAddress(Buffer.from(data.address, 'hex'), addressType);

        if (this.isCurrencyMode()) {
          const transfers = data.transfers;
          const isAdmin = this.getAdmins().has(data.address);
          if (Array.isArray(transfers))
            this.validateTransfers(data.address, addressType, transfers, balances);

          let totalAmount = 0n;
          // @ts-ignore
          if (Array.isArray(transfers)) for (const tx of transfers) totalAmount += tx.amount;

          if (data.gasUsed > data.gasLimit)
            throw new Error(
              `Gas limit exceeded: used ${data.gasUsed} > limit ${data.gasLimit} for sender "${execAddress}"`,
            );

          const maxPriorityFeePerGas = data.maxPriorityFeePerGas;
          const maxFeePerGas = data.maxFeePerGas; // user sets this

          const effectiveGasPrice = baseFeePerGas + maxPriorityFeePerGas;
          const gasPricePaid = effectiveGasPrice > maxFeePerGas ? maxFeePerGas : effectiveGasPrice;

          const gasUsed = data.gasUsed;
          const totalFee = gasUsed * gasPricePaid;

          if (!balances[execAddress]) {
            balances[execAddress] = 0n;
            if (emitEvents)
              this.#emit(TinyChainEvents.BalanceStarted, execAddress, balances[execAddress]);
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
                if (emitEvents) this.#emit(TinyChainEvents.BalanceStarted, from, balances[from]);
              }
              if (!balances[to]) {
                balances[to] = 0n;
                if (emitEvents) this.#emit(TinyChainEvents.BalanceStarted, to, balances[to]);
              }
              // @ts-ignore
              balances[from] -= amount;
              // @ts-ignore
              balances[to] += amount;
            }
          }

          if (emitEvents)
            this.#emit(TinyChainEvents.BalanceUpdated, {
              transfers,
              address: execAddress,
              isAdmin,
              isSufficientBalance,
              totalAmount,
              totalFee,
            });
        }

        if (this.isPayloadMode() && emitEvents)
          this.#emit(TinyChainEvents.Payload, execAddress, data.payload);
      }

      const totalReward = reward + totalGasCollected;
      const minerAddr = isMinerAddress ? minerAddress : '0';
      if (!balances[minerAddr]) {
        balances[minerAddr] = 0n;
        if (emitEvents) this.#emit(TinyChainEvents.BalanceStarted, minerAddr, balances[minerAddr]);
      }
      balances[minerAddr] += totalReward;

      if (emitEvents)
        this.#emit(TinyChainEvents.MinerBalanceUpdated, {
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
    if (!this.isCurrencyMode()) throw new Error('Currency mode must be enabled.');
    /** @type {Balances} */
    const result = {};
    for (const [addr, amount] of Object.entries(this.#getBalances())) result[addr] = amount;
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
    const chainList = this.#getChain();
    if (!this.isCurrencyMode() && !this.isPayloadMode())
      throw new Error('Currency mode or payload mode must be enabled.');
    const end = endIndex !== null ? endIndex : chainList.length - 1;
    if (startIndex < 0 || end >= chainList.length || startIndex > end)
      throw new Error('Invalid startIndex or endIndex range.');

    /** @type {Balances} */
    const balances = {};
    for (const [address, balance] of Object.entries(this.getInitialBalances()))
      balances[address] = BigInt(balance);

    const chain = chainList.slice(startIndex, end + 1);
    for (const block of chain) this.updateBalance(block, balances, false);

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
    if (!this.isCurrencyMode()) throw new Error('Currency mode must be enabled.');
    const balances = this.#getBalances();
    if (typeof balances[address] === 'bigint') return balances[address];
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
    if (this.isCurrencyMode() || this.isPayloadMode())
      for (const block of this.#getChain()) this.updateBalance(block);
    this.#emit(TinyChainEvents.BalanceRecalculated, this.#getBalances());
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
    const chain = this.#getChain();
    if (!chain[index]) throw new Error(`The chain data ${index} don't exist!`);
    return chain[index];
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
    return this.#getChain().map((block) => block.get());
  }

  /**
   * Clears the entire blockchain.
   *
   * This method removes all blocks from the chain, effectively resetting the blockchain to an empty state.
   * It also resets any other associated data, like balances and burned balances.
   *
   * @emits ChainCleared - Emitted when the blockchain is cleared.
   *
   * @returns {void}
   */
  cleanChain() {
    this.chain = [];
    this.balances = {};
    this.#emit(TinyChainEvents.ChainCleared);
    this.startBalances();
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
    const chain = this.#getChain();
    const end = endIndex !== null ? endIndex : chain.length - 1;
    if (startIndex < 0 || end >= chain.length || startIndex > end)
      throw new Error('Invalid startIndex or endIndex range.');

    return chain.slice(startIndex, end + 1).map((b) => b.export());
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
    this.#emit(TinyChainEvents.ImportChain, this.#getChain());
  }

  /**
   * Sets the default base fee per gas (in gwei).
   * @param {bigint} value
   */
  setBaseFeePerGas(value) {
    if (typeof value !== 'bigint') throw new Error('baseFeePerGas must be a bigint');
    if (value < 0n) throw new Error('baseFeePerGas cannot be negative');
    this.baseFeePerGas = BigInt(value);
  }

  /**
   * Sets the default max priority fee per gas (in gwei).
   * @param {bigint} value
   */
  setDefaultPriorityFee(value) {
    if (typeof value !== 'bigint') throw new Error('priorityFeeDefault must be a bigint');
    if (value < 0n) throw new Error('priorityFeeDefault cannot be negative');
    this.priorityFeeDefault = BigInt(value);
  }

  /**
   * Sets the transfer gas cost per transaction.
   * @param {bigint} value
   */
  setTransferGas(value) {
    if (typeof value !== 'bigint') throw new Error('transferGas must be a bigint');
    if (value < 0n) throw new Error('transferGas cannot be negative');
    this.transferGas = value;
  }

  /**
   * Sets the chain difficulty.
   * @param {bigint} value
   */
  setDiff(value) {
    if (typeof value !== 'bigint') throw new Error('diff must be a bigint');
    if (value < 0n) throw new Error('diff cannot be negative');
    this.diff = value;
  }

  /**
   * Returns the base fee per gas (in gwei).
   * @returns {bigint}
   */
  getBaseFeePerGas() {
    if (typeof this.baseFeePerGas !== 'bigint') throw new Error('baseFeePerGas must be a bigint');
    return this.baseFeePerGas;
  }

  /**
   * Returns the default priority fee (in gwei).
   * @returns {bigint}
   */
  getDefaultPriorityFee() {
    if (typeof this.priorityFeeDefault !== 'bigint')
      throw new Error('priorityFeeDefault must be a bigint');
    return this.priorityFeeDefault;
  }

  /**
   * Returns the current transfer gas cost per transaction.
   * @returns {bigint}
   */
  getTransferGas() {
    if (typeof this.transferGas !== 'bigint') throw new Error('transferGas must be a bigint');
    return this.transferGas;
  }

  /**
   * Returns the chain difficulty.
   * @returns {bigint}
   */
  getDiff() {
    if (typeof this.diff !== 'bigint') throw new Error('diff must be a bigint');
    return this.diff;
  }

  /**
   * Returns the initial reward per block.
   * @returns {bigint}
   */
  getInitialReward() {
    if (typeof this.initialReward !== 'bigint') throw new Error('initialReward must be a bigint');
    return this.initialReward;
  }

  /**
   * Returns the halving interval.
   * @returns {bigint}
   */
  getHalvingInterval() {
    if (typeof this.halvingInterval !== 'bigint')
      throw new Error('halvingInterval must be a bigint');
    return this.halvingInterval;
  }

  /**
   * Returns the last block reward index.
   * @returns {bigint}
   */
  getLastBlockReward() {
    if (typeof this.lastBlockReward !== 'bigint')
      throw new Error('lastBlockReward must be a bigint');
    return this.lastBlockReward;
  }

  /**
   * Returns the chain ID.
   * @returns {bigint}
   */
  getChainId() {
    if (typeof this.chainId !== 'bigint') throw new Error('chainId must be a bigint');
    return this.chainId;
  }

  /**
   * Returns true if the blockchain is in currency mode.
   * @returns {boolean}
   */
  isCurrencyMode() {
    if (typeof this.currencyMode !== 'boolean') throw new Error('currencyMode must be a boolean');
    return this.currencyMode;
  }

  /**
   * Returns true if the blockchain is in payload mode.
   * @returns {boolean}
   */
  isPayloadMode() {
    if (typeof this.payloadMode !== 'boolean') throw new Error('payloadMode must be a boolean');
    return this.payloadMode;
  }

  /**
   * Returns a list of all admin addresses.
   * @returns {Set<string>}
   */
  getAdmins() {
    if (!(this.admins instanceof Set)) throw new Error('admins must be a Set');
    for (const addr of this.admins) {
      if (typeof addr !== 'string') throw new Error('Each admin address must be a string');
    }
    return this.admins;
  }

  /**
   * Returns true if payloads are stored as string.
   * @returns {boolean}
   */
  isPayloadString() {
    if (typeof this.#payloadString !== 'boolean')
      throw new Error('#payloadString must be a boolean');
    return this.#payloadString;
  }

  /**
   * Gets the maximum allowed size (in bytes) in a block's content.
   * @returns {number}
   */
  getBlockContentSizeLimit() {
    return this.#blockContentSizeLimit;
  }

  /**
   * Gets the maximum payload size allowed per transaction (in bytes).
   * @returns {number}
   */
  getPayloadSizeLimit() {
    return this.#payloadSizeLimit;
  }

  /**
   * Gets the maximum total size allowed for a block (in bytes).
   * @returns {number}
   */
  getBlockSizeLimit() {
    return this.#blockSizeLimit;
  }
}

export default TinyChainInstance;
