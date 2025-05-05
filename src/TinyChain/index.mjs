import TinyChainBlock from './Block.mjs';
import TinyChainInstance from './Instance.mjs';

/**
 *
 * To create a working instance, use {@link TinyChain.Instance}, and {@link TinyChain.Events} to access the event names
 *
 * This class is **not available for production mode**.
 *
 * @beta
 * @class
 */
class TinyChain {
  static Instance = TinyChainInstance;
  static Block = TinyChainBlock;

  /**
   * This constructor is intentionally blocked.
   *
   * ⚠️ You must NOT instantiate TinyChain directly.
   * To create a working instance, use {@link TinyChain.Instance}:
   *
   * ```js
   * const client = new TinyChain.Instance();
   * ```
   *
   * Access event constants with:
   *
   * ```js
   * TinyChain.Events
   * ```
   *
   * @constructor
   * @throws {Error} Always throws an error to prevent direct instantiation.
   */
  constructor() {
    throw new Error('You must use new TinyChain.Instance() to create your new instance.');
  }
}

export default TinyChain;
