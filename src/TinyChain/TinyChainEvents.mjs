/**
 * List of event names used by TinyChain in the EventEmitter.
 * Each key maps to its string identifier.
 */
class TinyChainEvents {
  /**
   * This class is not meant to be instantiated.
   *
   * TinyChainEvents is a static-only class. All its members should be accessed directly through the class.
   *
   * @throws {Error} Always throws an error saying you can't summon it like a tiny pudding.
   */
  constructor() {
    throw new Error(
      "Oops! TinyChainEvents isn't something you can summon like a tiny pudding. Just use it statically 🍮 :3",
    );
  }

  /** Triggered when initial balances are updated. */
  static InitialBalancesUpdated = 'InitialBalancesUpdated';

  /** Triggered when the blockchain instance finishes its initialization. */
  static Initialized = 'Initialized';

  /** Triggered when a new block is successfully added to the chain. */
  static NewBlock = 'NewBlock';

  /** Triggered when all balances are initialized. */
  static BalancesInitialized = 'BalancesInitialized';

  /** Triggered when a balance record is first created for an address. */
  static BalanceStarted = 'BalanceStarted';

  /** Triggered when a balance value is updated for an existing address. */
  static BalanceUpdated = 'BalanceUpdated';

  /** Triggered when a payload is emitted as part of a block or transaction. */
  static Payload = 'Payload';

  /** Triggered when the miner's balance is updated after a block is mined. */
  static MinerBalanceUpdated = 'MinerBalanceUpdated';

  /** Triggered when balances are recalculated during import. */
  static BalanceRecalculated = 'BalanceRecalculated';

  /** Triggered when the entire blockchain is cleared or reset. */
  static ChainCleared = 'ChainCleared';

  /** Triggered when a new chain is imported and replaces the current one. */
  static ImportChain = 'ImportChain';

  /**
   * @returns {string[]}
   */
  static get all() {
    const items = [];
    for (const key of Object.getOwnPropertyNames(this)) {
      // Skip getters or non-string static properties
      if (key !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(this, key);
        if (descriptor && typeof descriptor.value === 'string') items.push(descriptor.value);
      }
    }
    return items;
  }

  /**
   * @param {string} event
   * @returns {boolean}
   */
  static isValid(event) {
    return this.all.includes(event);
  }
}

export default TinyChainEvents;
