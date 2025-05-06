import stringify from 'safe-stable-stringify';

// Default ANSI color codes
const DEFAULT_COLORS = {
  reset: '\x1b[0m',
  key: '\x1b[36m', // cyan (chaves)
  string: '\x1b[32m', // green (strings comuns)
  string_url: '\x1b[34m', // blue (URLs)
  string_bool: '\x1b[35m', // magenta (booleanos)
  string_number: '\x1b[33m', // yellow (números em string)
  string_unicode: '\x1b[38;5;141m', // lilac (strings com unicode)
  number: '\x1b[33m', // yellow (números)
  boolean: '\x1b[35m', // magenta (booleanos)
  null: '\x1b[1;30m', // gray (null)
  special: '\x1b[31m', // red (valores especiais como [Circular])
  func: '\x1b[90m', // dim (funções)
};

/**
 * Apply colors to a JSON string using ANSI escape codes
 * @param {string} str - Raw JSON string
 * @param {Record<string, string>} colors - ANSI color map
 * @returns {string}
 */
function colorizeJSON(str, colors) {
  // Colorize keys (object property names)
  const keyMatches = [];
  str = str.replace(/"([^"]+)":/g, (_, key) => {
    const marker = `___KEY${keyMatches.length}___`;
    keyMatches.push({ marker, key });
    return `${marker}:`; // manter o : para compatibilidade
  });

  // Colorize strings with special cases (URL, boolean, number, unicode, etc.)
  str = str.replace(/("(?:\\.|[^"\\])*?")/g, (match) => {
    const val = match.slice(1, -1); // remove surrounding quotes

    if (/^(https?|ftp):\/\/[^\s]+$/i.test(val)) {
      return `${colors.string_url}${match}${colors.reset}`;
    }

    if (/^(true|false|null)$/.test(val)) {
      return `${colors.string_bool}${match}${colors.reset}`;
    }

    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val)) {
      return `${colors.string_number}${match}${colors.reset}`;
    }

    if (/\\u[0-9a-fA-F]{4}/.test(val)) {
      return `${colors.string_unicode}${match}${colors.reset}`;
    }

    return `${colors.string}${match}${colors.reset}`;
  });

  for (const { marker, key } of keyMatches) {
    const regex = new RegExp(marker, 'g');
    str = str.replace(regex, `${colors.key}"${key}"${colors.reset}`);
  }

  // Colorize numbers (numeric values)
  str = str.replace(/\b(-?\d+(\.\d+)?([eE][+-]?\d+)?)\b/g, `${colors.number}$1${colors.reset}`);

  // Colorize booleans (true/false)
  str = str.replace(/\b(true|false)\b/g, `${colors.boolean}$1${colors.reset}`);

  // Colorize null values
  str = str.replace(/\bnull\b/g, `${colors.null}null${colors.reset}`);

  // Colorize special values like "[Circular]" and "[undefined]"
  str = str.replace(/\[Circular\]/g, `${colors.special}[Circular]${colors.reset}`);
  str = str.replace(/\[undefined\]/g, `${colors.special}[undefined]${colors.reset}`);

  // Colorize function strings (function definitions)
  str = str.replace(/"function\s.*?"/g, `${colors.func}$&${colors.reset}`);

  return str;
}

/**
 * Safely stringify and colorize JSON with optional custom colors
 * @param {any} obj - The object to stringify
 * @param {number} [indent=2] - Indentation level
 * @param {Partial<typeof DEFAULT_COLORS>} [customColors] - Optional overrides for colors
 * @returns {string}
 */
export function colorSafeStringify(obj, indent = 2, customColors = {}) {
  const colors = { ...DEFAULT_COLORS, ...customColors };
  const json = stringify(obj, null, indent);
  return colorizeJSON(json, colors);
}
