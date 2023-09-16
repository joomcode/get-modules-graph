# get-modules-graph

[![NPM version][npm-image]][npm-url]
[![minzipped size][size-image]][size-url]
[![code style: prettier][prettier-image]][prettier-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![License MIT][license-image]][license-url]

Get and traverse graph of ECMAScript/TypeScript modules.

## Basic example

```ts
import {dirname, join, sep} from 'node:path';

import {getModulesGraph} from 'get-modules-graph';

const modulesGraph = await getModulesGraph<number>({
  chooseIndexModule: (resolvedPath, directoryPath, directoryContent) => {
    if ('index.ts' in directoryContent) {
      return 'index.ts';
    }

    throw new Error(
      `Cannot choose index module in directory \`${directoryPath}\` for \`${resolvedPath}\``,
    );
  },
  chooseModule: (resolvedPath, parsedPath, directoryContent) => {
    const fileName = `${parsedPath.base}.ts`;

    if (fileName in directoryContent) {
      return fileName;
    }

    throw new Error(`Cannot choose module for \`${resolvedPath}\``);
  },
  directories: [],
  modules: ['./index.ts'],
  onAddDependencies: () => {},
  onAddModule: (_module, source) => source.length,
  resolvePath: (modulePath, rawPath) => {
    if (rawPath[0] === '.') {
      return `.${sep}${join(dirname(modulePath), rawPath)}`;
    }

    return rawPath;
  },
  skipDirectory: () => false,
  skipModule: () => false,
  transformSource: (_path, source) => source,
});

console.log(modulesGraph.circularDependencies);
console.log(modulesGraph.errors);
console.log(modulesGraph.modules);
console.log(modulesGraph.packages);
```

## Install

Requires [node](https://nodejs.org/en/) version 10 or higher:

```sh
npm install get-modules-graph
```

`get-modules-graph` works in any environment that supports ES2018
(because package uses [RegExp Named Capture Groups](https://github.com/tc39/proposal-regexp-named-groups)).

## License

[MIT][license-url]

[conventional-commits-image]: https://img.shields.io/badge/Conventional_Commits-1.0.0-yellow.svg 'The Conventional Commits specification'
[conventional-commits-url]: https://www.conventionalcommits.org/en/v1.0.0/
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg 'The MIT License'
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/get-modules-graph.svg 'get-modules-graph'
[npm-url]: https://www.npmjs.com/package/get-modules-graph
[prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg 'Prettier code formatter'
[prettier-url]: https://prettier.io/
[size-image]: https://img.shields.io/bundlephobia/minzip/get-modules-graph 'get-modules-graph'
[size-url]: https://bundlephobia.com/package/get-modules-graph
