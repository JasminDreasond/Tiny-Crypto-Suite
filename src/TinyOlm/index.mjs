import TinyOlmEvents from './Events.mjs';
import TinyOlmInstance from './Instance.mjs';

/**
 * TinyOlm is a lightweight wrapper for handling encryption sessions using the Olm cryptographic library.
 *
 * This class is **not available for production mode**.
 *
 * @beta
 * @class
 */
class TinyOlm {
  static Instance = TinyOlmInstance;
  static Events = TinyOlmEvents;
}

export default TinyOlm;
