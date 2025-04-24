import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import preserveDirectories from 'rollup-preserve-directives';

import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync('./package.json'));

// Function to get all .js files from src/
function getAllInputFiles(dir = 'src') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return getAllInputFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith('.mjs')) return fullPath;
    return [];
  });
  return files;
}

const inputFiles = getAllInputFiles();

// Prepare Plugins
const plugins = [resolve({ preferBuiltins: true }), json(), commonjs(), preserveDirectories()];

export default [
  {
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})],
    input: inputFiles,
    output: {
      dir: 'dist',
      format: 'cjs',
      sourcemap: false,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].cjs',
    },
    plugins,
  },
];
