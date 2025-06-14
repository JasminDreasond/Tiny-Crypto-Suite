import tinyOlm from './TinyOlmModule.mjs';
import TinyOlmEvents from './TinyOlmEvents.mjs';
import TinyOlmInstance from './TinyOlmInstance.mjs';

/**
 * TinyOlm is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
 *
 * To create a working instance, use {@link TinyOlm.Instance}, and {@link TinyOlm.Events} to access the event names.
 *
 * This class is in beta version!
 *
 * @beta
 * @class
 */
class TinyOlm {
  /** @typedef {import('@matrix-org/olm')} Olm */
  static Instance = TinyOlmInstance;
  static Events = TinyOlmEvents;

  /**
   * Returns the previously loaded `@matrix-org/olm` instance.
   * Assumes the module has already been loaded.
   *
   * @returns {Olm} The `@matrix-org/olm` module.
   */
  static getOlm() {
    return tinyOlm.getOlm();
  }

  /**
   * Dynamically imports the `@matrix-org/olm` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * @returns {Promise<Olm>} The loaded `@matrix-org/olm` module.
   */
  static fetchOlm() {
    return tinyOlm.fetchOlm();
  }

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
