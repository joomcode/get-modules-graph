import {dirname, join, sep} from 'node:path';

import {getModulesGraph} from './index';

declare const process: {env: {_START: string}};

let testsCount = 0;

function assert(value: boolean, message: string): asserts value is true {
  if (value !== true) {
    throw new TypeError(`❌ Assert "${message}" fails`);
  }

  testsCount += 1;

  console.log(' ✅', message);
}

const ok = (message: string) => console.log(`\x1B[32m[OK]\x1B[39m ${message}`);
const startTestsTime = Date.now();

ok(`Build passed in ${startTestsTime - Number(process.env._START)}ms!`);

assert(typeof getModulesGraph === 'function', 'getModulesGraph is a function');

const emptyGraphPromise = getModulesGraph({
  chooseIndexModule: () => '',
  chooseModule: () => '',
  directories: [],
  modules: [],
  onAddDependencies: () => {},
  onAddModule: () => {},
  resolvePath: () => '',
  skipDirectory: () => false,
  skipModule: () => false,
});

const modulesGraphPromise = getModulesGraph<number>({
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
});

Promise.all([emptyGraphPromise, modulesGraphPromise]).then(([emptyGraph, modulesGraph]) => {
  assert(emptyGraph.errors.length === 0, 'gets empty graph without errors');
  assert(Object.keys(emptyGraph.modules).length === 0, 'empty graph has no modules');

  assert(modulesGraph.circularDependencies.length === 2, 'finds all circular dependencies');

  assert(modulesGraph.errors.length === 0, 'gets graph without errors');

  assert('processImportPackage.ts' in modulesGraph.modules, 'gets modules by imports');

  assert('parse-imports-exports' in modulesGraph.packages, 'gets packages by imports');

  for (const modulePath in modulesGraph.modules) {
    const module = modulesGraph.modules[modulePath]!;

    if (module instanceof Promise) {
      throw new Error(`Module is a promise`);
    }

    if ('errors' in module || 'parseErrors' in module || 'warnings' in module) {
      assert(false, 'gets modules without errors and warnings');
    }

    if (!(module.uncompletedDependenciesCount >= 0)) {
      assert(false, 'all modules have uncompleted dependencies counter');
    }

    if (module.expectedExports) {
      if (Object.keys(module.exports!).length !== Object.keys(module.expectedExports).length) {
        assert(false, 'gets modules without errors and warnings');
      }

      for (const name in module.expectedExports) {
        if (!(name in module.exports!)) {
          assert(false, 'gets modules with all expected exports');
        }
      }
    }
  }

  ok(`All ${testsCount} tests passed in ${Date.now() - startTestsTime}ms!`);
});
