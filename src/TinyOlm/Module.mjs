class TinyOlmModule {
  /** @typedef {import('@matrix-org/olm')} Olm */

  constructor() {
    this.Olm = null;
  }

  /**
   * Dynamically imports the `@matrix-org/olm` module and stores it in the instance.
   * Ensures the module is loaded only once (lazy singleton).
   *
   * This method is private and should not be called directly from outside.
   *
   * @returns {Promise<Olm>} The loaded `@matrix-org/olm` module.
   */
  async fetchOlm() {
    if (!this.Olm) {
      const Olm = await import(/* webpackMode: "eager" */ '@matrix-org/olm').catch(() => {
        console.warn(
          '[TinyOlm] Warning: "@matrix-org/olm" is not installed. ' +
            'TinyOlm requires "@matrix-org/olm" to function properly. ' +
            'Please install it with "npm install @matrix-org/olm" if you intend to use certificate-related features.',
        );
        return null;
      });
      if (Olm) {
        // @ts-ignore
        this.Olm = Olm?.default ?? Olm;
        if (this.Olm) await this.Olm.init();
      }
    }
    return this.getOlm();
  }

  /**
   * Returns the previously loaded `@matrix-org/olm` instance.
   * Assumes the module has already been loaded.
   *
   * @returns {Olm} The `@matrix-org/olm` module.
   */
  getOlm() {
    if (typeof this.Olm === 'undefined' || this.Olm === null)
      throw new Error(
        `Failed to initialize Olm: Module is ${this.Olm !== null ? 'undefined' : 'null'}.\n` +
          'Please make sure "@matrix-org/olm" is installed.\n' +
          'You can install it by running: npm install @matrix-org/olm',
      );
    return this.Olm;
  }
}

const tinyOlm = new TinyOlmModule();

export default tinyOlm;
