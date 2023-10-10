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
  /**
   * Chooses an index module in a directory by the resolved path and directory path.
   * Throws an error if a directory and not a file is selected.
   */
  chooseIndexModule: (resolvedPath, directoryPath, directoryContent) => {
    if ('index.ts' in directoryContent) {
      return 'index.ts';
    }

    throw new Error(
      `Cannot choose index module in directory \`${directoryPath}\` for \`${resolvedPath}\``,
    );
  },
  /**
   * Chooses a module (or directory) in a directory by the resolved path
   * to a module in that directory.
   * If a directory is chosen, the choosing process will continue in a `chooseIndexModule` call
   * already for the contents of that chosen directory.
   */
  chooseModule: (resolvedPath, parsedPath, directoryContent) => {
    const fileName = `${parsedPath.base}.ts`;

    if (fileName in directoryContent) {
      return fileName;
    }

    throw new Error(`Cannot choose module for \`${resolvedPath}\``);
  },
  /**
   * List of relative paths to directories for recursive traversal in depth
   * and by their dependencies.
   */
  directories: [],
  /**
   * If `true`, then `import(...)` expression with static strings will be taken into account
   * (as importing the namespace of the entire module).
   */
  includeDynamicImports: true,
  /**
   * If `true`, then `require(...)` expression with static strings will be taken into account
   * (as importing the namespace of the entire module).
   */
  includeRequires: true,
  /**
   * List of relative paths to modules for recursive traversal by their dependencies.
   */
  modules: ['./index.ts'],
  /**
   * The callback on completing (adding) dependencies to a module.
   * Called when all module dependencies have been recursively completed.
   * Always called before the `onAddModule` callback.
   * Should return the data obtained from the dependencies of the module,
   * which will be stored in the `dependenciesData` module field.
   */
  onAddDependencies: () => {},
  /**
   * The callback on adding a module. Called as soon as the module has been parsed
   * and added to the module graph (without its own dependencies).
   * Should return the data obtained from the source code of the module,
   * which will be stored in the `sourceData` module field.
   */
  onAddModule: (_module, source) => source.length,
  /**
   * Resolves raw path to dependency module (after the `from` keyword) to relative path
   * from current working directory or to bare path to the package.
   * The returned relative path to the module must begin with a dot,
   * otherwise it will be considered the path to the package.
   * The returned path must use `path.sep` as path segment separator.
   * If returns `undefined`, dependency module is skipped.
   */
  resolvePath: (modulePath, rawPath) => {
    if (rawPath[0] === '.') {
      return `.${sep}${join(dirname(modulePath), rawPath)}`;
    }

    return rawPath;
  },
  /**
   * If `true`, then we respect string literals when parsing, that is,
   * we ignore the expressions inside them (but parsing will be a little slower).
   */
  respectStringLiterals: true,
  /**
   * If returns `true`, directory is skipped in recursive directories traversal.
   */
  skipDirectory: () => false,
  /**
   * If returns `true`, module is skipped in recursive directories traversal.
   */
  skipModule: () => false,
  /**
   * Transforms source of module.
   */
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
