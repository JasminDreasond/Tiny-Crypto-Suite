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

## 📦 Installation

```bash
npm install tiny-essentials
```

Make sure you also have a polyfill for `Buffer` if used in browsers.

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
