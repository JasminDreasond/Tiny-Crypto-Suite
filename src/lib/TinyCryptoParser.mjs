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
  constructor() {
    // Regex
    this.addValueType(
      'regexp',
      /**
       * @param {*} value - The serialized regular expression string.
       * @returns {RegExp} The deserialized RegExp object.
       */
      (value) => {
        const match = value.match(/^\/(.*)\/([gimsuy]*)$/);
        return match ? new RegExp(match[1], match[2]) : new RegExp(value);
      },
      // Convert
      (data) => ({ __type: 'regexp', value: data.toString() }),
    );

    // Html
    this.addValueType(
      'htmlElement',
      /**
       * @param {*} value - The serialized outerHTML string of the HTML element.
       * @returns {HTMLElement} The deserialized HTML element.
       * @throws {Error} Throws an error if deserialization is attempted outside the browser environment.
       */
      (value) => {
        if (typeof document === 'undefined')
          throw new Error('HTMLElement deserialization is only supported in browsers');
        const div = document.createElement('div');
        div.innerHTML = value;
        return div;
      },
      // Convert
      (data) => ({ __type: 'htmlelement', value: data.outerHTML }),
    );

    // Date
    this.addValueType(
      'date',
      /**
       * @param {*} value - The ISO string representation of the date.
       * @returns {Date} The deserialized Date object.
       */
      (value) => new Date(value),
      // Convert
      (data) => ({ __type: 'date', value: data.toISOString() }),
    );

    // BigInt
    this.addValueType(
      'bigint',
      /**
       * @param {*} value - The string representation of the BigInt.
       * @returns {BigInt} The deserialized BigInt object.
       */
      (value) => BigInt(value),
      // Convert
      (data) => ({ __type: 'bigint', value: data.toString() }),
    );

    // Number
    this.addValueType(
      'number',
      /**
       * @param {*} value - The string or numeric representation of the number.
       * @returns {number} The deserialized number.
       */
      (value) => Number(value),
      // Convert
      (data) => ({ __type: 'number', value: String(data) }),
    );

    // Boolean
    this.addValueType(
      'boolean',
      /**
       * @param {*} value - The string representation of the boolean value.
       * @returns {boolean} The deserialized boolean value.
       */
      (value) => Boolean(value),
      // Convert
      (data) => ({ __type: 'boolean', value: data }),
    );

    // String
    this.addValueType(
      'string',
      /**
       * @param {*} value - The serialized string.
       * @returns {string} The deserialized string.
       */
      (value) => String(value),
      // Convert
      (data) => ({ __type: 'string', value: data }),
    );

    // Map
    this.addValueType(
      'map',
      /**
       * @param {*} value - The serialized array of key-value pairs for Map deserialization.
       * @returns {Map<any, any>} The deserialized Map object.
       */
      (value) => new Map(value),
      // Convert
      (data) => ({
        __type: 'map',
        value: Array.from(data.entries()),
      }),
      // Serialization
      (data) => {
        const result = new Map();
        data.forEach(
          /** @param {*} value @param {*} key */ (value, key) => {
            result.set(key, this.serializeDeep(value));
          },
        );
        return result;
      },
      // Deserialization
      (value) => {
        const result = new Map();
        value.forEach(
          /** @param {*} value @param {*} key */ (value, key) => {
            result.set(key, this.deserializeDeep(value).value);
          },
        );
        return result;
      },
    );

    // Set
    this.addValueType(
      'set',
      /**
       * @param {*} value - The serialized array of values for Set deserialization.
       * @returns {Set<*>} The deserialized Set object.
       */
      (value) => new Set(value),
      // Convert
      (data) => ({
        __type: 'set',
        value: Array.from(data.values()),
      }),
      // Serialization
      (data) => {
        const result = new Set();
        data.forEach(
          /** @param {*} value */ (value) => {
            result.add(this.serializeDeep(value));
          },
        );
        return result;
      },
      // Deserialization
      (value) => {
        const result = new Set();
        value.forEach(
          /** @param {*} item */ (item) => {
            result.add(this.deserializeDeep(item).value);
          },
        );
        return result;
      },
    );

    // Symbol
    this.addValueType(
      'symbol',
      /**
       * @param {*} value - The string description of the symbol.
       * @returns {Symbol} The deserialized Symbol.
       */
      (value) => Symbol(value),
      // Convert
      (data) => ({ __type: 'symbol', value: data.description }),
    );

    // Array
    this.addValueType(
      'array',
      /**
       * @param {*} value - The serialized representation of the array.
       * @returns {Array<*>} The deserialized array.
       */
      (value) => value,
      // Convert
      (data) => ({ __type: 'array', value: data }),
      // Serialization
      (data) => data.map(/** @param {*} item */ (item) => this.serializeDeep(item)),
      // Deserialization
      (value) => value.map(/** @param {*} item */ (item) => this.deserializeDeep(item).value),
    );

    // Object
    this.addValueType(
      'object',
      /**
       * @param {*} value - The serialized representation of the plain JSON object.
       * @returns {Record<string|number, any>} The deserialized object.
       */
      (value) => value,
      // Convert
      (data) => ({ __type: 'object', value: data }),
      // Serialization
      (data) => {
        /** @type {Record<string|number, any>} */
        const result = {};
        for (const key in data) result[key] = this.serializeDeep(data[key]);
        return result;
      },
      // Deserialization
      (value) => {
        /** @type {Record<string|number, any>} */
        const result = {};
        for (const key in value) result[key] = this.deserializeDeep(value[key]).value;
        return result;
      },
    );

    // Buffer
    this.addValueType(
      'buffer',
      /**
       * @param {*} value - The base64-encoded string representation of the buffer.
       * @returns {Buffer} The deserialized Buffer object.
       */
      (value) => Buffer.from(value, 'base64'),
      // Convert
      (data) => ({ __type: 'buffer', value: data.toString('base64') }),
    );
  }

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
    null: () => ({ __type: 'null' }),
    undefined: () => ({ __type: 'undefined' }),
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
   */
  #valueTypes = {
    /** @returns {null} The deserialized null value. */
    null: () => null,
    /**  @returns {undefined} The deserialized undefined value. */
    undefined: () => undefined,
  };

  /**
   * A mapping of data deserialization to their functions.
   * @type {Record<string, (data: any) => any>}
   */
  #deepDeserialize = {};

  /**
   * A mapping of data serialization to their functions.
   * @type {Record<string, (data: any) => any>}
   */
  #deepSerialize = {};

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
   * @param {(data: any) => any} [serializeDeep]
   * @param {(data: any) => any} [deserializeDeep]
   */
  addValueType(typeName, getFunction, convertFunction, serializeDeep, deserializeDeep) {
    // Basic features
    if (this.#valueTypes[typeName] || this.#valueConvertTypes[typeName])
      throw new Error(`Type "${typeName}" already exists.`);
    if (typeof getFunction !== 'function' || typeof convertFunction !== 'function')
      throw new Error('Both getFunction and convertFunction must be functions.');
    this.#valueTypes[typeName] = getFunction;
    this.#valueConvertTypes[typeName] = convertFunction;

    // Serialization
    if (typeof serializeDeep === 'function' || typeof deserializeDeep === 'function') {
      if (typeof serializeDeep !== 'function' || typeof deserializeDeep !== 'function')
        throw new Error('Both serializeDeep and deserializeDeep must be functions.');
      this.#deepDeserialize[typeName] = deserializeDeep;
      this.#deepSerialize[typeName] = serializeDeep;
    }
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
    if (typeof type === 'string' && typeof this.#deepSerialize[type] === 'function')
      return this.serialize(this.#deepSerialize[type](data));
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
    return {
      value:
        typeof this.#deepDeserialize[type] === 'function'
          ? this.#deepDeserialize[type](value)
          : value,
      type,
    };
  }
}

export default TinyCryptoParser;
