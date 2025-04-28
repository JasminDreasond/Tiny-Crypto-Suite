/**
 * @fileoverview Script to test the CryptoManager class with all supported data types.
 * This includes primitives, complex types, and expected serialization failures.
 */

import { TinyCrypto } from '../dist/index.mjs';

// Instancia padrão
const crypto = new TinyCrypto();

/**
 * Lista de valores para testar criptografia/criptografia reversa
 * Cada entrada contém o tipo e o valor de teste.
 */
const testValues = [
  { label: 'String', value: 'Hello, world!' },
  { label: 'Number', value: 42 },
  { label: 'BigInt', value: BigInt('9007199254740991') },
  { label: 'Boolean', value: true },
  { label: 'Null', value: null },
  { label: 'Undefined', value: undefined },
  { label: 'Date', value: new Date('2024-01-01T00:00:00Z') },
  { label: 'Symbol', value: Symbol('sym') },
  { label: 'Array', value: [1, 2, 3] },
  { label: 'Object', value: { name: 'Yasmin', age: 23 } },
  {
    label: 'Map',
    value: new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]),
  },
  { label: 'Set', value: new Set([1, 2, 3]) },
  { label: 'Buffer', value: Buffer.from('Hello buffer!') },
  { label: 'RegExp', value: /hello\d+/gi },

  {
    label: 'Multi Object',
    value: {
      name: 'Yasmin',
      age: 23,
      inventory: ['pudding', 'ponies'],
      keys: {
        settings: new Set([{ mio: true }, 2, 3]),
        isPudding: true,
        secret: [1, 2],
        secret2: { 1: true, 2: false, mio: { yay: true } },
        map: new Map([
          ['pudding', 'chocolate'],
          ['pony', 'mio'],
        ]),
      },
      map: new Map([
        ['pudding', { chocolate: true, tiny: true, big: false, settings: new Set([1, 2, 3]) }],
      ]),
    },
  },

  // HTML apenas se estiver no navegador
  ...(typeof document !== 'undefined'
    ? [
        {
          label: 'HTMLElement',
          value: (() => {
            const el = document.createElement('div');
            el.id = 'test';
            el.textContent = 'Hello element';
            return el;
          })(),
        },
      ]
    : []),

  // Tipos que devem falhar
  { label: 'Function (should fail)', value: () => 'I am a function' },
  { label: 'Promise (should fail)', value: Promise.resolve('ok') },
  { label: 'WeakMap (should fail)', value: new WeakMap() },
  { label: 'WeakSet (should fail)', value: new WeakSet() },
];

// Test runner
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',

  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',

  divider: '\x1b[90m────────────────────────────────────\x1b[0m',
};

const tinyCryptoSimulation = async () => {
  console.log(`${colors.bold}${colors.cyan}🔒 CryptoManager Data Type Test\n${colors.reset}`);

  for (const test of testValues) {
    try {
      const encrypted = crypto.encrypt(test.value);
      const decrypted = crypto.decrypt(encrypted);
      const type = crypto.getTypeFromEncrypted(encrypted);

      console.log(`${colors.green}✅ ${colors.bold}${test.label}${colors.reset}`);
      console.log(`${colors.blue}  Raw:${colors.reset}`, test.value);
      console.log(
        `${colors.yellow}  Encrypted:${colors.reset}\n${colors.gray}${JSON.stringify(encrypted, null, 2)}${colors.reset}`,
      );
      console.log(`${colors.blue}  Type:${colors.reset}`, type);
      console.log(`${colors.blue}  Decrypted:${colors.reset}`, decrypted);
    } catch (err) {
      console.log(
        `${colors.red}❌ ${colors.bold}${test.label}${colors.reset} ${colors.red}failed: ${err.message}${colors.reset}`,
      );
    }

    console.log(colors.divider);
  }
};

export default tinyCryptoSimulation;
