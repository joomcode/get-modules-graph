/**
 * @file Creates CJS files from each JS file in the directories.
 */

import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const paths = process.argv.slice(2);

if (paths.length === 0) {
  paths.push('.');
}

/**
 * Replaces `.js` file extension to `.cjs`.
 */
const replaceExtension = (fileName: string): string => fileName.replace('.js', '.cjs');

for (const path of paths) {
  const fileNames = readdirSync(path, {encoding: 'utf8', recursive: true});

  for (const fileName of fileNames) {
    if (!fileName.endsWith('.js')) {
      continue;
    }

    const reexportedNames: string[] = [];
    const filePath = join(path, fileName);
    let fileContent = readFileSync(filePath, {encoding: 'utf8'});

    fileContent = fileContent.replace(
      /^import {([^}]+)} from ([^;]*);/gim,
      (_match, names, modulePath) =>
        `const {${names.replaceAll(' as ', ': ')}} = require(${replaceExtension(modulePath)});`,
    );

    fileContent = fileContent.replace(
      /^import ([^ ]+) from ([^;]*);/gim,
      (_match, name, modulePath) =>
        `const ${name} = require(${replaceExtension(modulePath)}).default;`,
    );

    fileContent = fileContent.replace(
      /^export {([^}]+)} from ([^;]*);/gim,
      (_match, names, modulePath) => {
        const exported: string = names
          .replace(' as default', ': __default')
          .replaceAll(' as ', ': ');
        const exportedNames = exported.split(',').map((name) => {
          name = name.includes(':') ? name.split(':')[1]! : name;
          name = name.trim();

          reexportedNames.push(name === '__default' ? 'default' : name);

          return name === '__default' ? 'default: __default' : name;
        });

        const path = replaceExtension(modulePath);
        const requiring = `const {${exported}} = require(${path});`;
        const assigning = `Object.assign(exports, {${exportedNames.join(', ')}});`;

        return `{\n${requiring}\n${assigning}\n};`;
      },
    );

    fileContent = fileContent.replace(
      /^export const ([^ ]+) /gim,
      (_match, name) => `const ${name} = exports.${name} `,
    );

    fileContent = fileContent.replace(/^export default /gim, () => {
      reexportedNames.push('default');

      return 'exports.default = ';
    });

    const reexports = reexportedNames.map((name) => `exports.${name} = undefined;`).join('\n');

    fileContent = `'use strict';\n${reexports}\n${fileContent}`;

    const newFilePath = replaceExtension(filePath);

    writeFileSync(newFilePath, fileContent);
  }
}
