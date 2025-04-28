# 📚 TinyCryptoParser Documentation

`TinyCryptoParser` is a JavaScript utility class that provides robust serialization and deserialization of complex JavaScript data types into JSON-compatible formats.  
It ensures data safety for encryption 🔒, transmission 📡, or storage 💾.

---

## ✨ Features

- Converts complex data types like `Map`, `Set`, `Buffer`, `Date`, `BigInt`, `Symbol`, and `HTMLElement`.
- Provides strong type validation during deserialization ✅.
- Throws errors for unsupported types like `WeakMap`, `WeakSet`, `Promise`, and `Function` 🚫.
- Deep serialization and deserialization support 🔁.

---

## 🔥 Usage Example

```javascript
import { TinyCryptoParser } from 'tiny-crypto-suite';

const parser = new TinyCryptoParser();

// Serialize a Map
const serialized = parser.serialize(new Map([['key', 'value']]));

// Deserialize it back
const { value, type } = parser.deserialize(serialized);

console.log(value); // Map { 'key' => 'value' }
console.log(type);  // 'map'
```

---

## 🏛️ Class: `TinyCryptoParser`

### ➡️ serialize(data)

🔹 Serializes a JavaScript value into a JSON-compatible string.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `data` | `any` | The data to serialize. |

| Returns | Type | Description |
|:--------|:-----|:------------|
| `string` | `string` | The serialized JSON string. |

⚠️ Throws an error if the data type is unsupported.

---

### ➡️ deserialize(text, expectedType = null)

🔹 Deserializes a JSON string back to its original JavaScript object.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `text` | `string` | The serialized string. |
| `expectedType` | `string \| null` | (Optional) Expected type to validate against. |

| Returns | Type | Description |
|:--------|:-----|:------------|
| `DeserializedData` | `{ value: any; type: string }` | The deserialized object and its type. |

⚠️ Throws an error if types mismatch when `expectedType` is provided.

---

### ➡️ serializeDeep(data)

🔹 Recursively serializes an entire object or array, converting all nested structures.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `data` | `any` | Data to deeply serialize. |

| Returns | Type | Description |
|:--------|:-----|:------------|
| `string` | `string` | Deeply serialized data. |

---

### ➡️ deserializeDeep(text, expectedType = null)

🔹 Recursively deserializes a deeply structured JSON string.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `text` | `string` | The deeply serialized string. |
| `expectedType` | `string \| null` | (Optional) Expected type for validation. |

| Returns | Type | Description |
|:--------|:-----|:------------|
| `DeserializedData` | `{ value: any; type: string }` | The deeply deserialized object. |

---

## 🧩 Supported Types

| Type | Serialization | Deserialization |
|:-----|:--------------|:----------------|
| `number` | ✅ | ✅ |
| `boolean` | ✅ | ✅ |
| `string` | ✅ | ✅ |
| `null` | ✅ | ✅ |
| `undefined` | ✅ | ✅ |
| `bigint` | ✅ | ✅ |
| `symbol` | ✅ | ✅ |
| `map` | ✅ | ✅ |
| `set` | ✅ | ✅ |
| `regexp` | ✅ | ✅ |
| `date` | ✅ | ✅ |
| `buffer` | ✅ | ✅ |
| `array` | ✅ | ✅ |
| `object` | ✅ | ✅ |
| `htmlElement` | ✅ (Browser Only) | ✅ (Browser Only) |
| `function`, `promise`, `weakmap`, `weakset` | ❌ Throws error 🚫 | N/A |

---

## ⚙️ Internal Mechanisms

### 🛠️ `#valueConvertTypes`
- Map of types → serialization functions.
- Handles type-specific transformations.

### 🛠️ `#valueTypes`
- Map of types → deserialization functions.
- Converts JSON-compatible representations back into real JavaScript objects.

### 🛡️ `#validateDeserializedType(expected, actual)`
- Ensures that deserialized data matches the expected type.
- Throws an error on mismatch.

---

## 🧹 Notes

- Buffer operations depend on Node.js's `Buffer` or browser polyfills.
- Deserialization of `HTMLElement` only works inside browser environments 🌐.
- Symbol descriptions are used for serialization; uniqueness is not guaranteed during restoration.

---

### ✨ `addValueType` Function Documentation

The `addValueType` function allows you to add new types and their corresponding converter functions to your instance. This function ensures that both the type and the converter are validated as proper functions and that a type name does not already exist in the list. 🚀

## Method Signature

```javascript
addValueType(typeName, getFunction, convertFunction)
```

### 📜 Parameters

- **`typeName`** `(string)`:
  - The name of the new type you wish to add. 🏷️
  - This name must be unique within the list of existing types. ❗

- **`getFunction`** `(function(data: any) => any)`:
  - A function that converts a serialized value back into a value representation. 🔄
  - This should be used to transform the data into a readable or usable format when needed.

- **`convertFunction`** `(function(data: any) => SerializedData)`:
  - A function responsible for serializing the value into a specific structured format. 🔧
  - The serialized value will usually be returned as an object, ensuring you can store it in a consistent way for future conversion.
  - For example, you might want to serialize a regular expression like this:
    ```javascript
    (data) => ({ __type: 'regexp', value: data.toString() })
    ```

- **`serializeDeep`** `(function(data: any) => any)` _(optional)_:
  - A function that deeply serializes a value type into a JSON-compatible format. 🌐🔐
  - This function is invoked when the data is serialized deeply, meaning if the type is complex (e.g., objects, arrays, or custom types), it will recursively traverse the structure and serialize each element.
  - For example, you might use this function to serialize a `Map` or `Set`, ensuring that each key-value pair or set element is serialized deeply.

- **`deserializeDeep`** `(function(data: any) => any)` _(optional)_:
  - A function that deeply deserializes a serialized value back to its original format. 🔄💡
  - This function is used to handle cases where you need to recursively parse complex data types (such as objects, arrays, `Map`, or `Set`) back into their original form.
  - For example, you might use this function to deserialize a `Map` or `Set`, converting it back into a structure that holds the appropriate data types.

### 🔙 Return

- This function does not return anything explicitly. It adds the `typeName`, `getFunction`, and `convertFunction` to their respective collections (`#valueTypes` and `#valueConvertTypes`). 📚

### ⚠️ Throws

- **`Error`**: If either `getFunction` or `convertFunction` is not a function, an error will be thrown. 🛑
- **`Error`**: If the provided `typeName` already exists in the list, an error will be thrown. ⚠️

## 🧑‍💻 Usage

### 📝 Example 1: Adding a Type for Regular Expressions

```javascript
myInstance.addValueType(
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
```

### 🌐 Example 2: Adding a Type for Array with serialization

```javascript
myInstance.addValueType(
  'array',
  /**
   * @param {*} value - The serialized representation of the array.
   * @returns {Array<*>} The deserialized array.
   */
  (value) => value,
  // Convert
  (data) => ({ __type: 'array', value: data }),
  // Serialization
  (data) => data.map(/** @param {*} item */ (item) => myInstance.serializeDeep(item)),
  // Deserialization
  (value) => value.map(/** @param {*} item */ (item) => myInstance.deserializeDeep(item).value),
);
```

### 🚨 Error Handling

If you try to add a type with an existing name or if the functions are not provided correctly, the function will throw an error. ❗

#### ⚠️ Example of Duplicate Type Name

```javascript
myInstance.addValueType('regexp');

// Error: Type "regexp" already exists. 🚫
```

#### 🛑 Example of Invalid Function Type

```javascript
myInstance.addValueType('number');

// Error: Both getFunction and convertFunction must be functions. ⚠️
```

## 🔍 How It Works Internally

- The function first validates whether both `getFunction` and `convertFunction` are indeed functions. ✅
- It then checks if the `typeName` already exists in the `#valueTypes` or `#valueConvertTypes` collections. If it does, it throws an error. 🚫
- Finally, it adds the new type and its corresponding conversion function to the collections. 📚

## 📌 Important Notes

- **Unique Type Names**: Ensure that the `typeName` you provide does not already exist. If you try to add a type with a name that already exists, an error will be thrown. ⚠️
- **Function Format**: Both the `getFunction` and `convertFunction` must follow the specified formats. The `getFunction` should serialize the value, and the `convertFunction` should convert it back to a usable format. 🔧