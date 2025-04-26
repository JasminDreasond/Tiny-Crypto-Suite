/**
 * Determines if the environment is a browser.
 *
 * This constant checks if the code is running in a browser environment by verifying if
 * the `window` object and the `window.document` object are available. It will return `true`
 * if the environment is a browser, and `false` otherwise (e.g., in a Node.js environment).
 *
 * @constant {boolean}
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
