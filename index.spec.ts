import {dirname, join, sep} from 'node:path';

import {getModulesGraph, resolveImports} from './index';

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
assert(typeof resolveImports === 'function', 'resolveImports is a function');

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
  modules: ['./index.spec.ts'],
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

  const {modules} = modulesGraph;

  assert(
    'processImportPackage.ts' in modules && 'processModule.ts' in modules,
    'gets modules by imports',
  );

  assert('parse-imports-exports' in modulesGraph.packages, 'gets packages by imports');

  for (const modulePath in modules) {
    const module = modules[modulePath]!;

    if (module instanceof Promise) {
      assert(false, 'module is resolved (not a promise)');
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

  const indexSpecModule = modules['index.spec.ts']!;
  const processModule = modules['processModule.ts']!;

  for (const module of [indexSpecModule, processModule]) {
    resolveImports(modulesGraph, module);

    for (const rawPath in module.imports) {
      const importObject = module.imports[rawPath]!;

      for (const name in importObject.names) {
        const nameObject = importObject.names[name]!;

        if (typeof nameObject.resolved !== 'object') {
          assert(false, 'resolveImports resolves all imports');
        }
      }
    }
  }

  const {resolved} = indexSpecModule.imports!['./index']!.names!['resolveImports']!;

  assert(
    resolved !== undefined &&
      resolved !== 'error' &&
      resolved.kind === 'name' &&
      resolved.modulePath === 'resolveImports.ts' &&
      resolved.name === 'resolveImports',
    'resolveImports resolves imports through reexports',
  );

  ok(`All ${testsCount} tests passed in ${Date.now() - startTestsTime}ms!`);
});
