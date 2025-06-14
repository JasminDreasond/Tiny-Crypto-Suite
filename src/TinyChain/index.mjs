import TinyBtcSecp256k1 from './Secp256k1/TinyBtcSecp256k1.mjs';
import TinySecp256k1 from './Secp256k1/index.mjs';

import TinyChainEvents from './TinyChainEvents.mjs';
import TinyChainBlock from './TinyChainBlock.mjs';
import TinyChainInstance from './TinyChainInstance.mjs';
import TinyEthSecp256k1 from './Secp256k1/TinyEthSecp256k1.mjs';
import TinySecp256k1Mock from './Secp256k1/TinySecp256k1Mock.mjs';

/**
 *
 * To create a working instance, use {@link TinyChain.Instance}, and {@link TinyChain.Events} to access the event names
 *
 * This class is in beta version!
 *
 * @beta
 * @class
 */
class TinyChain {
  static Instance = TinyChainInstance;
  static Block = TinyChainBlock;
  static Events = TinyChainEvents;
  static Secp256k1 = TinySecp256k1;
  static Btc256k1 = TinyBtcSecp256k1;
  static Eth256k1 = TinyEthSecp256k1;
  static Mock256k1 = TinySecp256k1Mock;

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
