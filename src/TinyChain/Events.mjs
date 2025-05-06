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
