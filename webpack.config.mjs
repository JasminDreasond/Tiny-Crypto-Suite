import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add modules
const modules = [];
const addModule = (entry, library, isClass = false) => {
  const baseConfig = {
    entry,
    output: {
      path: path.resolve(__dirname, 'dist'),
      library,
      libraryTarget: 'window',
      libraryExport: isClass ? library : undefined,
    },
    optimization: {
      usedExports: true,
      runtimeChunk: false,
      splitChunks: false,
    },
    plugins: [
      new NodePolyfillPlugin(),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
  };
  modules.push(
    // Non-minified version
    /** {
      ...baseConfig,
      mode: 'development',
      output: {
        ...baseConfig.output,
        filename: `${library}.js`,
      },
      optimization: {
        ...baseConfig.optimization,
        minimize: false,
      },
    }, */
    // Minified version
    {
      ...baseConfig,
      mode: 'production',
      output: {
        ...baseConfig.output,
        filename: `${library}.min.js`,
      },
      optimization: {
        ...baseConfig.optimization,
        minimize: true,
      },
    },
  );
};

// Main
addModule('./src/build/TinyCryptoParser.mjs', 'TinyCryptoParser', true);
addModule('./src/build/TinyCertCrypto.mjs', 'TinyCertCrypto', true);
addModule('./src/build/TinyCrypto.mjs', 'TinyCrypto', true);
addModule('./src/build/TinyOlm.mjs', 'TinyOlm', true);
addModule('./src/build/TinyChain.mjs', 'TinyChain', true);

export default modules;
