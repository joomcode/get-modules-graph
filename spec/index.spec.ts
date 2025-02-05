import 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, sep} from 'node:path';

import {
  getModulesGraph,
  type Name,
  type RawPath,
  resolveImports,
  resolveReexports,
} from '../src/index.js';

import {expectedBarModule, expectedBazModule, expectedFooModule} from './expected.js';
import foo, {Bar, baz, foo as asFoo, fs, read as asRead} from './foo.js';
import {assert, assertEqualExceptNumbers, ok, testsCount} from './utils.js';

const require = createRequire(import.meta.url);

const quxNamespace: {default: 42} = require('./qux.cjs');

// @ts-expect-error
declare const bazNamespace: import('./baz');

declare const bazNamespaceType: typeof import('./baz');

`
import "./baz";
`;

export * as foo from 'node:buffer';
export * as default from 'node:buffer';

export {join} from 'node:path';

export {resolveReexports as asResolveReexports} from '../src/index.js';

export declare class C {
  asFoo: typeof asFoo;
  asRead: typeof asRead;
  Bar: typeof Bar;
  baz: typeof baz;
  bazNamespace: typeof bazNamespace;
  foo: typeof foo;
  fs: typeof fs;
  quxNamespace: typeof quxNamespace;
}

declare const process: {env: {_START: string}};

const startTestsTime = Date.now();

ok(`Build passed in ${startTestsTime - Number(process.env._START)}ms!`);

assert(typeof getModulesGraph === 'function', '`getModulesGraph` is a function');
assert(typeof resolveImports === 'function', '`resolveImports` is a function');
assert(typeof resolveReexports === 'function', '`resolveReexports` is a function');

const emptyGraph = await getModulesGraph({
  chooseIndexModule: () => '',
  chooseModule: () => '',
  directories: [],
  includeDynamicImports: true,
  includeRequires: false,
  modules: [],
  onAddDependencies: () => {},
  onAddModule: () => {},
  resolvePath: () => '',
  respectStringLiterals: true,
  skipDirectory: () => false,
  skipModule: () => false,
  transformSource: (_path, source) => source,
});

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
    let fileName = `${parsedPath.base}.ts`;

    if (fileName in directoryContent) {
      return fileName;
    }

    fileName = `${parsedPath.name}.ts`;

    if (fileName in directoryContent) {
      return fileName;
    }

    if (parsedPath.base in directoryContent) {
      return parsedPath.base;
    }

    throw new Error(`Cannot choose module for \`${resolvedPath}\``);
  },
  directories: [],
  includeDynamicImports: true,
  includeRequires: true,
  modules: ['./spec/index.spec.ts'],
  onAddDependencies: () => {},
  onAddModule: (_module, source) => source.length,
  resolvePath: (modulePath, rawPath) => {
    if (rawPath[0] === '.') {
      return `.${sep}${join(dirname(modulePath), rawPath)}`;
    }

    return rawPath;
  },
  respectStringLiterals: true,
  skipDirectory: () => false,
  skipModule: () => false,
  transformSource: (path, source) => {
    if (path === 'src/processModule.ts') {
      return `${source}\nexport const qux = 1`;
    }

    if (path === 'spec/bar.ts') {
      const cuttedSource = source.split('export const bar')[0]!;

      return `${cuttedSource}\nexport {baz as bar} from './foo.js';`;
    }

    if (path === 'spec/baz.ts') {
      const cuttedSource = source.split('export const destructuringFoo')[0]!;

      return `${cuttedSource}\nexport const {foo: destructuringFoo, bar: destructuringBar}: {foo?: object; bar?: object} = {};`;
    }

    return source;
  },
});

assert(emptyGraph.errors.length === 0, 'gets empty graph without errors');
assert(Object.keys(emptyGraph.modules).length === 0, 'empty graph has no modules');

assert(modulesGraph.circularDependencies.length === 4, 'finds all circular dependencies');

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
      `get module \`${module.path}\` with expected warnings`,
    );
  } else if ('errors' in module || 'parseErrors' in module || 'warnings' in module) {
    assert(false, 'gets modules without errors and warnings');
  }

  if (!(module.uncompletedDependenciesCount >= 0)) {
    assert(false, 'all modules have uncompleted dependencies counter');
  }

  if (module.expectedExports && Object.keys(module.expectedExports).length > 0) {
    for (const rawPath in module.reexports) {
      if (module.reexports[rawPath as RawPath]!.star) {
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

const barModule = modules['spec/bar.ts']!;
const bazModule = modules['spec/baz.ts']!;
const fooModule = modules['spec/foo.ts']!;
const indexSpecModule = modules['spec/index.spec.ts']!;
const processModule = modules['src/processModule.ts']!;

assert('exports' in indexSpecModule, 'includes reexports');
assert(!('C' in indexSpecModule.exports!), 'do not includes type exports');

assert('node:fs' in indexSpecModule.imports!, 'includes imports without names and default value');

assert('qux' in processModule.exports!, 'correctly transforms source');

for (const module of [indexSpecModule, fooModule, barModule, bazModule, processModule]) {
  resolveImports(modulesGraph, module);
  resolveReexports(modulesGraph, module);

  for (const rawPath in module.imports) {
    const importObject = module.imports[rawPath as RawPath]!;

    for (const name in importObject.names) {
      const nameObject = importObject.names[name as Name]!;

      if (typeof nameObject.resolved !== 'object') {
        assert(false, '`resolveImports` resolves all imports');
      }
    }
  }

  for (const rawPath in module.reexports) {
    const reexportObject = module.reexports[rawPath as RawPath]!;

    for (const name in reexportObject.names) {
      const nameObject = reexportObject.names[name as Name]!;

      if (typeof nameObject.resolved !== 'object') {
        assert(false, '`resolveReexports` resolves all reexports');
      }
    }
  }
}

const {defaultExport} = indexSpecModule;
const {namespace: dynamicImportNamespace} = indexSpecModule.imports!['./baz' as RawPath]!;
const {namespace: requireNamespace} = indexSpecModule.imports!['./qux.cjs' as RawPath]!;
const {resolved: resolvedBar} =
  indexSpecModule.imports!['./foo.js' as RawPath]!.names!['Bar' as Name]!;
const {resolved: resolvedFoo} =
  indexSpecModule.imports!['./foo.js' as RawPath]!.names!['foo' as Name]!;
const {resolved: resolvedFs} =
  indexSpecModule.imports!['./foo.js' as RawPath]!.names!['fs' as Name]!;
const {resolved: resolvedImports} =
  indexSpecModule.imports!['../src/index.js' as RawPath]!.names!['resolveImports' as Name]!;
const {resolved: resolvedJoin} =
  indexSpecModule.reexports!['node:path' as RawPath]!.names!['join' as Name]!;
const {resolved: resolvedParseImportsExports} =
  processModule.imports!['./utils.js' as RawPath]!.names!['parseImportsExports' as Name]!;
const {resolved: resolvedRead} =
  indexSpecModule.imports!['./foo.js' as RawPath]!.names!['read' as Name]!;
const {resolved: resolvedReexports} =
  indexSpecModule.reexports!['../src/index.js' as RawPath]!.names!['asResolveReexports' as Name]!;
const {resolved: resolvedPackageNamespace} =
  indexSpecModule.reexports!['node:buffer' as RawPath]!.namespaces!['foo' as Name]!;
const {resolvedDefault: resolvedPackageDefault} =
  indexSpecModule.reexports!['node:buffer' as RawPath]!;

assert(
  defaultExport !== undefined &&
    defaultExport.from === 'node:buffer' &&
    defaultExport.namespace === true,
  '`defaultExport` from namespace is correct',
);

assert(
  dynamicImportNamespace !== undefined &&
    Object.keys(dynamicImportNamespace).length === 1 &&
    dynamicImportNamespace.kind === 'dynamic import',
  '`import(...)` expression is correctly parsed',
);

assert(
  requireNamespace !== undefined &&
    Object.keys(requireNamespace).length === 1 &&
    requireNamespace.kind === 'require',
  '`require(...)` expression is correctly parsed',
);

assert(
  resolvedBar !== undefined &&
    resolvedBar !== 'error' &&
    resolvedBar.kind === 'namespace' &&
    resolvedBar.modulePath === 'spec/bar.ts',
  '`resolveImports` resolves modules namespaces through reexports',
);

assert(
  resolvedFoo !== undefined &&
    resolvedFoo !== 'error' &&
    resolvedFoo.kind === 'name' &&
    resolvedFoo.modulePath === 'spec/bar.ts' &&
    resolvedFoo.name === 'foo',
  '`resolveImports` resolves imports through star',
);

assert(
  resolvedFs !== undefined &&
    resolvedFs !== 'error' &&
    resolvedFs.kind === 'namespace from package' &&
    resolvedFs.packagePath === 'node:fs',
  '`resolveImports` resolves packages namespaces through reexports',
);

assert(
  resolvedImports !== undefined &&
    resolvedImports !== 'error' &&
    resolvedImports.kind === 'name' &&
    resolvedImports.modulePath === 'src/resolveImports.ts' &&
    resolvedImports.name === 'resolveImports',
  '`resolveImports` resolves imports through reexports',
);

assert(
  resolvedJoin !== undefined &&
    resolvedJoin !== 'error' &&
    resolvedJoin.kind === 'name from package' &&
    resolvedJoin.packagePath === 'node:path' &&
    resolvedJoin.name === 'join',
  '`resolveReexports` resolves reexports from packages',
);

assert(
  resolvedParseImportsExports !== undefined &&
    resolvedParseImportsExports !== 'error' &&
    resolvedParseImportsExports.kind === 'name from package' &&
    resolvedParseImportsExports.packagePath === 'parse-imports-exports' &&
    resolvedParseImportsExports.name === 'parseImportsExports',
  '`resolveImports` resolves imports from packages through reexports',
);

assert(
  resolvedRead !== undefined &&
    resolvedRead !== 'error' &&
    resolvedRead.kind === 'from packages' &&
    resolvedRead.name === 'read' &&
    resolvedRead.packagesPaths[0] === 'node:fs',
  '`resolveImports` resolves imports from packages through star',
);

assert(
  resolvedReexports !== undefined &&
    resolvedReexports !== 'error' &&
    resolvedReexports.kind === 'name' &&
    resolvedReexports.modulePath === 'src/resolveReexports.ts' &&
    resolvedReexports.name === 'resolveReexports',
  '`resolveReexports` resolves reexports from modules',
);

assert(
  resolvedPackageNamespace !== undefined &&
    resolvedPackageNamespace !== 'error' &&
    resolvedPackageNamespace.kind === 'namespace from package' &&
    resolvedPackageNamespace.packagePath === 'node:buffer',
  '`resolveReexports` resolves namespaces reexports from packages',
);

assert(
  resolvedPackageDefault !== undefined &&
    resolvedPackageDefault !== 'error' &&
    resolvedPackageDefault.kind === 'namespace from package' &&
    resolvedPackageDefault.packagePath === 'node:buffer',
  '`resolveReexports` resolves default reexports from packages',
);

assertEqualExceptNumbers(barModule, expectedBarModule, 'star exports from packages are correct');

assertEqualExceptNumbers(bazModule, expectedBazModule, 'default named reexports is correct');

assertEqualExceptNumbers(
  fooModule,
  expectedFooModule,
  'all kinds of imports and reexports are correct',
);

ok(`All ${testsCount} tests passed in ${Date.now() - startTestsTime}ms!`);
