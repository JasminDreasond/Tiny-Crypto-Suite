import { Buffer } from 'buffer';
import { objType } from 'tiny-essentials';

/**
 * TinyCryptoParser provides serialization and deserialization utilities for complex JavaScript data types.
 *
 * This class enables conversion of various JavaScript values (such as `Map`, `Set`, `Buffer`, `Date`, `BigInt`, `Symbol`, `HTMLElement`, and others)
 * into JSON-compatible formats, allowing safe encryption, transmission, or storage.
 * It also supports deserialization, restoring the original JavaScript objects from the serialized data.
 *
 * Unsupported types like `WeakMap`, `WeakSet`, `Promise`, and `Function` will throw explicit errors when an attempt is made to serialize them.
 *
 * It includes built-in validation to ensure the integrity of types during deserialization, providing stronger consistency guarantees
 * when handling critical data transformations.
 *
 * @class
 */
class TinyCryptoParser {
  /**
   * @typedef {Object} DeserializedData
   * @property {any} value - The deserialized value, which can be any JavaScript type.
   * @property {string} type - The type of the deserialized data (e.g., 'object', 'array', 'string', etc.).
   */

  /** @typedef {{ __type: string, value?: any }} SerializedData */

  /**
   * A mapping of data types to their serialization functions.
   *
   * This object defines how various JavaScript types should be serialized to a JSON-compatible format.
   * It includes handling for primitive types, complex objects, and non-serializable types such as functions
   * and promises, which throw an error when attempted to be serialized.
   *
   * Each key corresponds to a specific data type (e.g., 'number', 'date', 'buffer', etc.),
   * and the value is a function that serializes the data to a specific format.
   *
   * @type {Record<string, (data: any) => SerializedData>}
   * @property {Function} weakmap - Throws an error as WeakMap cannot be serialized.
   * @property {Function} weakset - Throws an error as WeakSet cannot be serialized.
   * @property {Function} promise - Throws an error as Promise cannot be serialized.
   * @property {Function} function - Throws an error as Function cannot be serialized.
   * @property {Function} regexp - Serializes RegExp objects to a JSON object with their string representation.
   * @property {Function} htmlElement - Serializes HTML elements to their outerHTML string.
   * @property {Function} date - Serializes Date objects to an ISO string format.
   * @property {Function} bigint - Serializes BigInt objects to their string representation.
   * @property {Function} number - Serializes numbers to a JSON-compatible format.
   * @property {Function} boolean - Serializes booleans to a JSON-compatible format.
   * @property {Function} string - Serializes strings to a JSON-compatible format.
   * @property {Function} null - Serializes null to a special 'Null' type in JSON.
   * @property {Function} undefined - Serializes undefined to a special 'Undefined' type in JSON.
   * @property {Function} map - Serializes Map objects to an array of entries in JSON format.
   * @property {Function} set - Serializes Set objects to an array of values in JSON format.
   * @property {Function} symbol - Serializes Symbol objects to a JSON object with the symbol's description.
   * @property {Function} array - Serializes arrays to a JSON-compatible format.
   * @property {Function} object - Serializes general objects to a JSON-compatible format.
   * @property {Function} buffer - Serializes Buffer objects to a base64-encoded string.
   */
  #valueConvertTypes = {
    weakmap: () => {
      throw new Error('WeakMap cannot be serialized');
    },
    weakset: () => {
      throw new Error('WeakSet cannot be serialized');
    },
    promise: () => {
      throw new Error('Promise cannot be serialized');
    },
    function: () => {
      throw new Error('Function cannot be serialized');
    },
    regexp: (data) => ({ __type: 'regexp', value: data.toString() }),
    htmlElement: (data) => ({ __type: 'htmlelement', value: data.outerHTML }),
    date: (data) => ({ __type: 'date', value: data.toISOString() }),
    bigint: (data) => ({ __type: 'bigint', value: data.toString() }),
    number: (data) => ({ __type: 'number', value: data }),
    boolean: (data) => ({ __type: 'boolean', value: data }),
    string: (data) => ({ __type: 'string', value: data }),
    null: () => ({ __type: 'null' }),
    undefined: () => ({ __type: 'undefined' }),
    map: (data) => ({
      __type: 'map',
      value: Array.from(data.entries()),
    }),
    set: (data) => ({
      __type: 'set',
      value: Array.from(data.values()),
    }),
    symbol: (data) => ({ __type: 'symbol', value: data.description }),
    array: (data) => ({ __type: 'array', value: data }),
    object: (data) => ({ __type: 'object', value: data }),
    buffer: (data) => ({ __type: 'buffer', value: data.toString('base64') }),
  };

  /**
   * A mapping of data types to their deserialization functions.
   *
   * This object defines how various serialized types should be deserialized back to their original JavaScript objects.
   * It includes support for primitive types, complex objects, and browser-specific types like `HTMLElement`.
   * Each key corresponds to a specific data type (e.g., 'Date', 'BigInt', 'Buffer', etc.),
   * and the value is a function that deserializes the value to its original format.
   *
   * @type {Record<string, (data: any) => any>}
   * @property {Function} regexp - Deserializes a regular expression from its string representation (e.g., `/pattern/flags`).
   * @property {Function} htmlelement - Deserializes an HTML element from its serialized outerHTML string (only works in browser environments).
   * @property {Function} date - Deserializes a date from its ISO string representation.
   * @property {Function} bigint - Deserializes a BigInt from its string representation.
   * @property {Function} number - Deserializes a number from its string or numeric representation.
   * @property {Function} boolean - Deserializes a boolean value from its string representation.
   * @property {Function} null - Deserializes the `null` value.
   * @property {Function} undefined - Deserializes the `undefined` value.
   * @property {Function} map - Deserializes a Map from an array of key-value pairs.
   * @property {Function} set - Deserializes a Set from an array of values.
   * @property {Function} symbol - Deserializes a Symbol from its string description.
   * @property {Function} array - Deserializes an array from its serialized representation.
   * @property {Function} object - Deserializes a plain JSON object from its serialized representation.
   * @property {Function} string - Deserializes a string from its serialized representation.
   * @property {Function} buffer - Deserializes a Buffer from its base64-encoded string representation.
   */
  #valueTypes = {
    /**
     * @param {*} value - The serialized regular expression string.
     * @returns {RegExp} The deserialized RegExp object.
     */
    regexp: (value) => {
      const match = value.match(/^\/(.*)\/([gimsuy]*)$/);
      return match ? new RegExp(match[1], match[2]) : new RegExp(value);
    },

    /**
     * @param {*} value - The serialized outerHTML string of the HTML element.
     * @returns {HTMLElement} The deserialized HTML element.
     * @throws {Error} Throws an error if deserialization is attempted outside the browser environment.
     */
    htmlelement: (value) => {
      if (typeof document === 'undefined')
        throw new Error('HTMLElement deserialization is only supported in browsers');
      const div = document.createElement('div');
      div.innerHTML = value;
      return div;
    },

    /**
     * @param {*} value - The ISO string representation of the date.
     * @returns {Date} The deserialized Date object.
     */
    date: (value) => new Date(value),

    /**
     * @param {*} value - The string representation of the BigInt.
     * @returns {BigInt} The deserialized BigInt object.
     */
    bigint: (value) => BigInt(value),

    /**
     * @param {*} value - The string or numeric representation of the number.
     * @returns {number} The deserialized number.
     */
    number: (value) => Number(value),

    /**
     * @param {*} value - The string representation of the boolean value.
     * @returns {boolean} The deserialized boolean value.
     */
    boolean: (value) => Boolean(value),

    /**
     * @returns {null} The deserialized null value.
     */
    null: () => null,

    /**
     * @returns {undefined} The deserialized undefined value.
     */
    undefined: () => undefined,

    /**
     * @param {*} value - The serialized array of key-value pairs for Map deserialization.
     * @returns {Map<any, any>} The deserialized Map object.
     */
    map: (value) => new Map(value),

    /**
     * @param {*} value - The serialized array of values for Set deserialization.
     * @returns {Set<*>} The deserialized Set object.
     */
    set: (value) => new Set(value),

    /**
     * @param {*} value - The string description of the symbol.
     * @returns {Symbol} The deserialized Symbol.
     */
    symbol: (value) => Symbol(value),

    /**
     * @param {*} value - The serialized representation of the array.
     * @returns {Array<*>} The deserialized array.
     */
    array: (value) => value,

    /**
     * @param {*} value - The serialized representation of the plain JSON object.
     * @returns {Record<string|number, any>} The deserialized object.
     */
    object: (value) => value,

    /**
     * @param {*} value - The serialized string.
     * @returns {string} The deserialized string.
     */
    string: (value) => String(value),

    /**
     * @param {*} value - The base64-encoded string representation of the buffer.
     * @returns {Buffer} The deserialized Buffer object.
     */
    buffer: (value) => Buffer.from(value, 'base64'),
  };

  /**
   * Validates that the actual type of a deserialized value matches the expected type.
   * This method ensures that the type of the deserialized data matches what is expected,
   * throwing an error if there's a mismatch.
   *
   * @param {string} expected - The expected type of the deserialized data.
   * @param {string} actual - The actual type of the deserialized data.
   * @throws {Error} If the types do not match.
   */
  #validateDeserializedType(expected, actual) {
    if (expected !== actual)
      throw new Error(`Type mismatch: expected ${expected}, but got ${actual}`);
  }

  /**
   * Add a new value type and its converter function.
   * @param {string} typeName
   * @param {(data: any) => any} getFunction
   * @param {(data: any) => SerializedData} convertFunction
   */
  addValueType(typeName, getFunction, convertFunction) {
    if (this.#valueTypes[typeName] || this.#valueConvertTypes[typeName])
      throw new Error(`Type "${typeName}" already exists.`);
    if (typeof getFunction !== 'function' || typeof convertFunction !== 'function')
      throw new Error('Both getFunction and convertFunction must be functions.');
    this.#valueTypes[typeName] = getFunction;
    this.#valueConvertTypes[typeName] = convertFunction;
  }

  /**
   * Serializes a given data value into a JSON-compatible format based on its type.
   * This method converts various JavaScript data types into their serialized representation
   * that can be encrypted or stored. If the data type is unsupported, an error is thrown.
   *
   * @param {any} data - The data to be serialized.
   * @returns {string} The serialized data in JSON format.
   * @throws {Error} If the data type is unsupported for serialization.
   */
  serialize(data) {
    const type = objType(data) || 'undefined';
    if (typeof type === 'string' && this.#valueConvertTypes[type])
      return JSON.stringify(this.#valueConvertTypes[type](data));
    throw new Error(`Unsupported data type for encryption: ${type}`);
  }

  /**
   * Deserializes a string back into its original JavaScript object based on the serialized type information.
   * This method checks the serialized type and converts the string back to its original JavaScript object
   * (such as a `Date`, `Buffer`, `RegExp`, etc.). If the type is unknown or unsupported, it returns the raw value.
   *
   * @param {string} text - The serialized data to be deserialized.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data. If provided, the method will validate the type of the deserialized value.
   * @returns {DeserializedData} An object containing the deserialized value and its type.
   * @throws {Error} If deserialization fails due to an invalid or unknown type.
   */
  deserialize(text, expectedType = null) {
    /** @type {{ value: any; type: string }} */
    const result = { value: null, type: 'unknown' };
    try {
      const parsed = JSON.parse(text);
      const type = parsed.__type;
      if (typeof type !== 'string') return { value: text, type: 'string' };
      if (typeof this.#valueTypes[type] === 'function') {
        result.value = this.#valueTypes[type](parsed.value);
        result.type = type;
      } else result.value = text;
    } catch {
      result.value = text;
      result.type = 'unknown';
    }

    if (expectedType) this.#validateDeserializedType(expectedType, result.type);
    return result;
  }

  /**
   * Recursively serializes a given data value into a JSON-compatible format.
   * If the data is an object or array, it will traverse each entry and serialize them individually.
   *
   * @param {any} data - The data to be deeply serialized.
   * @returns {string} The deeply serialized data in JSON format.
   * @throws {Error} If the data type is unsupported for serialization.
   */
  serializeDeep(data) {
    const type = objType(data) || 'undefined';

    if (type === 'object') {
      /** @type {Record<string|number, any>} */
      const result = {};
      for (const key in data) result[key] = this.serializeDeep(data[key]);
      return this.serialize(result);
    }

    if (type === 'array') {
      const result = data.map(/** @param {*} item */ (item) => this.serializeDeep(item));
      return this.serialize(result);
    }

    if (type === 'map') {
      const result = new Map();
      data.forEach(
        /** @param {*} value @param {*} key */ (value, key) => {
          result.set(key, this.serializeDeep(value));
        },
      );
      return this.serialize(result);
    }

    if (type === 'set') {
      const result = new Set();
      data.forEach(
        /** @param {*} value */ (value) => {
          result.add(this.serializeDeep(value));
        },
      );
      return this.serialize(result);
    }

    return this.serialize(data);
  }

  /**
   * Recursively deserializes a string back into its original value format.
   * If the data is an object or array, it will traverse each entry and deserialize them individually.
   *
   * @param {string} text - The serialized data to be deeply deserialized.
   * @param {string|null} [expectedType=null] - Optionally specify the expected type of the decrypted data.
   * @returns {DeserializedData} An object containing the deserialized value and its type.
   * @throws {Error} If deserialization fails due to an invalid or unknown type.
   */
  deserializeDeep(text, expectedType = null) {
    const { value, type } = this.deserialize(text, expectedType);
    /** @type {DeserializedData} */
    const tinyResult = { value: null, type };

    // Object
    if (type === 'object') {
      /** @type {Record<string|number, any>} */
      const result = {};
      for (const key in value) result[key] = this.deserializeDeep(value[key]).value;
      tinyResult.value = result;
    }

    // Array
    else if (type === 'array')
      tinyResult.value = value.map(
        /** @param {*} item */ (item) => this.deserializeDeep(item).value,
      );
    // Map
    else if (type === 'map') {
      const result = new Map();
      value.forEach(
        /** @param {*} value @param {*} key */ (value, key) => {
          result.set(key, this.deserializeDeep(value).value);
        },
      );
      tinyResult.value = result;
    }

    // Set
    else if (type === 'set') {
      const result = new Set();
      value.forEach(
        /** @param {*} item */ (item) => {
          result.add(this.deserializeDeep(item).value);
        },
      );
      tinyResult.value = result;
    }

    // Normal
    else tinyResult.value = value;

    // Complete
    return tinyResult;
  }
}

export default TinyCryptoParser;
