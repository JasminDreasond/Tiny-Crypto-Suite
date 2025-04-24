import { Buffer } from 'buffer';

/**
 * An object containing type validation functions and their evaluation order.
 *
 * Each item in `typeValidator.items` is a function that receives any value
 * and returns a boolean indicating whether the value matches the corresponding type.
 *
 * The `order` array defines the priority in which types should be checked,
 * which can be useful for functions that infer types in a consistent manner.
 *
 * @typedef {Object} TypeValidator
 * @property {Object.<string, (val: any) => boolean>} items - A dictionary of type validation functions.
 * @property {string[]} order - The order in which types should be evaluated.
 */

/**
 * Validates values against specific types using predefined functions.
 *
 * @type {TypeValidator}
 */
const typeValidator = {
  items: {
    /** Checks if the value is undefined. */
    undefined: (val) => typeof val === 'undefined',

    /** Checks if the value is null. */
    null: (val) => val === null,

    /** Checks if the value is a boolean. */
    boolean: (val) => typeof val === 'boolean',

    /** Checks if the value is a number. */
    number: (val) => typeof val === 'number' && !isNaN(val),

    /** Checks if the value is a bigint. */
    bigint: (val) => typeof val === 'bigint',

    /** Checks if the value is a string. */
    string: (val) => typeof val === 'string',

    /** Checks if the value is a symbol. */
    symbol: (val) => typeof val === 'symbol',

    /** Checks if the value is a function. */
    function: (val) => typeof val === 'function',

    /** Checks if the value is an array. */
    array: (val) => Array.isArray(val),

    /** Checks if the value is a Date object. */
    date: (val) => val instanceof Date,

    /** Checks if the value is a regular expression. */
    regexp: (val) => val instanceof RegExp,

    /** Checks if the value is a Map. */
    map: (val) => val instanceof Map,

    /** Checks if the value is a Set. */
    set: (val) => val instanceof Set,

    /** Checks if the value is a WeakMap. */
    weakmap: (val) => val instanceof WeakMap,

    /** Checks if the value is a WeakSet. */
    weakset: (val) => val instanceof WeakSet,

    /** Checks if the value is a Promise. */
    promise: (val) => val instanceof Promise,

    /** Checks if the value is a Buffer. */
    buffer: (val) => typeof Buffer !== 'undefined' && Buffer.isBuffer(val),

    /** Checks if the value is a File. */
    file: (val) => typeof File !== 'undefined' && val instanceof File,

    /** Checks if the value is a Html Element. */
    htmlelement: (val) => typeof HTMLElement !== 'undefined' && val instanceof HTMLElement,

    /** Checks if the value is a non-null plain object or instance of a class. */
    object: (val) => typeof val === 'object' && val !== null,
  },

  /** Evaluation order of the type checkers. */
  order: [
    'undefined',
    'null',
    'boolean',
    'number',
    'bigint',
    'string',
    'symbol',
    'function',
    'array',
    'buffer',
    'file',
    'date',
    'regexp',
    'map',
    'set',
    'weakmap',
    'weakset',
    'promise',
    'htmlelement',
    'object',
  ],
};

/**
 * Adds new type checkers to the typeValidator without overwriting existing ones.
 *
 * Optionally, you can specify the index at which the new type should be inserted in the order.
 * If no index is provided, the type is inserted just before 'object' (if it exists), or at the end.
 *
 * @param {Object.<string, (val: any) => boolean>} newItems - New type validators to be added.
 * @param {number} [index] - Optional. Position at which to insert each new type. Ignored if the type already exists.
 * @returns {string[]} - A list of successfully added type names.
 *
 * @example
 * extendObjType({
 *   htmlElement2: val => typeof HTMLElement !== 'undefined' && val instanceof HTMLElement
 * });
 */
export function extendObjType(newItems, index) {
  const added = [];

  for (const [key, fn] of Object.entries(newItems)) {
    if (!typeValidator.items.hasOwnProperty(key)) {
      typeValidator.items[key] = fn;

      let insertAt = typeof index === 'number' ? index : -1; // Default to -1 if index isn't provided

      // Default to before 'object', or to the end
      if (insertAt === -1) {
        const objectIndex = typeValidator.order.indexOf('object');
        insertAt = objectIndex > -1 ? objectIndex : typeValidator.order.length;
      }

      // Ensure insertAt is a valid number and not out of bounds
      insertAt = Math.min(Math.max(0, insertAt), typeValidator.order.length);

      typeValidator.order.splice(insertAt, 0, key);
      added.push(key);
    }
  }

  return added;
}

/**
 * Reorders the typeValidator.order array according to a custom new order.
 * All values in the new order must already exist in the current order.
 * The function does not mutate the original array structure directly.
 *
 * @param {string[]} newOrder - The new order of type names.
 * @returns {boolean} - Returns true if the reorder was successful, false if invalid keys were found.
 *
 * @example
 * reorderObjTypeOrder([
 *   'string', 'number', 'array', 'object'
 * ]);
 */
export function reorderObjTypeOrder(newOrder) {
  const currentOrder = [...typeValidator.order]; // shallow clone

  // All keys in newOrder must exist in currentOrder
  const isValid = newOrder.every((type) => currentOrder.includes(type));

  if (!isValid) return false;

  // Reassign only if valid
  typeValidator.order = newOrder.slice(); // assign shallow copy
  return true;
}

/**
 * Returns a cloned version of the `typeValidator.order` array.
 * The cloned array will not be affected by future changes to the original `order`.
 *
 * @returns {string[]} - A new array with the same values as `typeValidator.order`.
 */
export function cloneObjTypeOrder() {
  return [...typeValidator.order]; // Creates a shallow copy of the array
}

/**
 * Returns the detected type name of a given value based on predefined type validators.
 *
 * This function uses `getType` with a predefined `typeValidator` to determine or compare types safely.
 * in the specified `typeValidator.order`. The first matching type is returned.
 *
 * If `val` is `null`, it immediately returns `'null'`.
 * If no match is found, it returns `'unknown'`.
 *
 * @param {any} val - The value whose type should be determined.
 * @returns {string} - The type name of the value (e.g., "array", "date", "map"), or "unknown" if no match is found.
 *
 * @example
 * getType([]); // "array"
 * getType(null); // "null"
 * getType(new Set()); // "set"
 * getType(() => {}); // "unknown"
 */
const getType = (val) => {
  if (val === null) return 'null';
  for (const name of typeValidator.order)
    if (!typeValidator.items[name] || typeValidator.items[name](val)) return name;
  return 'unknown';
};

/**
 * Checks the type of a given object or returns its type as a string.
 *
 * @param {*} obj - The object to check or identify.
 * @param {string} [type] - Optional. If provided, checks whether the object matches this type (e.g., "object", "array", "string").
 * @returns {boolean|string|null} - Returns `true` if the type matches, `false` if not,
 *                                   the type string if no type is provided, or `null` if the object is `undefined`.
 *
 * @example
 * objType([], 'array'); // true
 * objType({}, 'object'); // true
 * objType('hello'); // "string"
 * objType(undefined); // null
 */
export function objType(obj, type) {
  if (typeof obj === 'undefined') return null;
  const result = getType(obj);
  if (typeof type === 'string') return result === type.toLowerCase();
  return result;
}
