import TinyOlmEvents from './Events.mjs';
import TinyOlmInstance from './Instance.mjs';

/**
 * TinyOlm is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
 *
 * To create a working instance, use {@link TinyOlm.Instance}, and {@link TinyOlm.Events} to access the event names
 *
 * This class is **not available for production mode**.
 *
 * @beta
 * @class
 */
class TinyOlm {
  static Instance = TinyOlmInstance;
  static Events = TinyOlmEvents;

  /**
   * This constructor is intentionally blocked.
   *
   * ⚠️ You must NOT instantiate TinyOlm directly.
   * To create a working instance, use {@link TinyOlm.Instance}, and {@link TinyOlm.Events} to access the event names:
   *
   * ```js
   * const client = new TinyOlm.Instance();
   * ```
   *
   * Access event constants with:
   *
   * ```js
   * TinyOlm.Events
   * ```
   *
   * @constructor
   * @throws {Error} Always throws an error to prevent direct instantiation.
   */
  constructor() {
    throw new Error('You must use new TinyOlm.Instance() to create your new instance.');
  }
}

export default TinyOlm;
