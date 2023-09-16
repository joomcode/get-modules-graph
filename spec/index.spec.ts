import 'node:fs';
import {dirname, join, sep} from 'node:path';

import {getModulesGraph, resolveImports} from '../src';

import {baz, foo as asFoo, read as asRead} from './foo';

declare const process: {env: {_START: string}};

export declare class C {
  baz: typeof baz;
  foo: typeof asFoo;
  read: typeof asRead;
}

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
  transformSource: (_path, source) => source,
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

    if (parsedPath.base in directoryContent) {
      return parsedPath.base;
    }

    throw new Error(`Cannot choose module for \`${resolvedPath}\``);
  },
  directories: [],
  modules: ['./spec/index.spec.ts'],
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
  transformSource: (path, source) => {
    if (path !== 'src/processModule.ts') {
      return source;
    }

    return `${source}\nexport const qux = 1`;
  },
});

Promise.all([emptyGraphPromise, modulesGraphPromise]).then(([emptyGraph, modulesGraph]) => {
  assert(emptyGraph.errors.length === 0, 'gets empty graph without errors');
  assert(Object.keys(emptyGraph.modules).length === 0, 'empty graph has no modules');

  assert(modulesGraph.circularDependencies.length === 3, 'finds all circular dependencies');

  assert(modulesGraph.errors.length === 0, 'gets graph without errors');

  const {modules} = modulesGraph;

  assert(
    'src/processImportPackage.ts' in modules && 'src/processModule.ts' in modules,
    'gets modules by imports',
  );

  assert('parse-imports-exports' in modulesGraph.packages, 'gets packages by imports');

  visitModules: for (const modulePath in modules) {
    const module = modules[modulePath]!;

    if (module instanceof Promise) {
      assert(false, 'module is resolved (is not a promise)');
    }

    if (module.path === 'spec/foo.ts' || module.path === 'spec/bar.ts') {
      assert(
        !('errors' in module) && !('parseErrors' in module) && 'warnings' in module,
        'get modules with expected warnings',
      );
    } else if ('errors' in module || 'parseErrors' in module || 'warnings' in module) {
      assert(false, 'gets modules without errors and warnings');
    }

    if (!(module.uncompletedDependenciesCount >= 0)) {
      assert(false, 'all modules have uncompleted dependencies counter');
    }

    if (module.expectedExports && Object.keys(module.expectedExports).length > 0) {
      for (const rawPath in module.reexports) {
        if (module.reexports[rawPath]!.star) {
          continue visitModules;
        }
      }

      const addedExports = module.path === 'src/processModule.ts' ? 1 : 0;

      if (
        Object.keys(module.exports!).length !==
        Object.keys(module.expectedExports).length + addedExports
      ) {
        assert(false, 'gets modules with expected exports');
      }

      for (const name in module.expectedExports) {
        if (!(name in module.exports!)) {
          assert(false, 'gets modules with all expected exports');
        }
      }
    }
  }

  const indexSpecModule = modules['spec/index.spec.ts']!;
  const processModule = modules['src/processModule.ts']!;

  assert(indexSpecModule.hasOwnProperty('exports') === false, 'do not includes type exports');

  assert('node:fs' in indexSpecModule.imports!, 'includes imports without names and default value');

  assert('qux' in processModule.exports!, 'correctly transforms source');

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

  const {resolved: resolvedFoo} = indexSpecModule.imports!['./foo']!.names!['foo']!;
  const {resolved: resolvedImports} = indexSpecModule.imports!['../src']!.names!['resolveImports']!;
  const {resolved: resolvedParseImportsExports} =
    processModule.imports!['./utils']!.names!['parseImportsExports']!;
  const {resolved: resolvedRead} = indexSpecModule.imports!['./foo']!.names!['read']!;

  assert(
    resolvedFoo !== undefined &&
      resolvedFoo !== 'error' &&
      resolvedFoo.kind === 'name' &&
      resolvedFoo.modulePath === 'spec/bar.ts' &&
      resolvedFoo.name === 'foo',
    'resolveImports resolves imports through star',
  );

  assert(
    resolvedImports !== undefined &&
      resolvedImports !== 'error' &&
      resolvedImports.kind === 'name' &&
      resolvedImports.modulePath === 'src/resolveImports.ts' &&
      resolvedImports.name === 'resolveImports',
    'resolveImports resolves imports through reexports',
  );

  assert(
    resolvedParseImportsExports !== undefined &&
      resolvedParseImportsExports !== 'error' &&
      resolvedParseImportsExports.kind === 'name from package' &&
      resolvedParseImportsExports.packagePath === 'parse-imports-exports' &&
      resolvedParseImportsExports.name === 'parseImportsExports',
    'resolveImports resolves imports from packages through reexports',
  );

  assert(
    resolvedRead !== undefined &&
      resolvedRead !== 'error' &&
      resolvedRead.kind === 'from packages' &&
      resolvedRead.name === 'read' &&
      resolvedRead.packagesPaths[0] === 'node:fs',
    'resolveImports resolves imports from packages through star',
  );

  ok(`All ${testsCount} tests passed in ${Date.now() - startTestsTime}ms!`);
});
