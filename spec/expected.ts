import type {Module, Name, RawPath} from '../src';

const start = 0;
const end = 0;
const sourceData = 0;
const uncompletedDependenciesCount = 0;

export const expectedBarModule: Module<number> = {
  path: 'spec/bar.ts',
  uncompletedDependenciesCount,
  warnings: {
    '1': "Duplicate (star) reexport from `./foo.js`:\nexport * from './foo.js' with {",
    '0:0': "Duplicate (star) reexport from `node:fs`:\nexport * from 'node:fs';",
  },
  exports: {
    ['foo' as Name]: {start, end, kind: 'const'},
    ['bar' as Name]: {from: './foo.js' as RawPath, kind: 'reexport', by: 'baz' as Name},
    ['fs' as Name]: {from: 'node:fs' as RawPath, kind: 'reexport', namespace: true},
  },
  reexports: {
    ['./foo.js' as RawPath]: {
      start,
      end,
      names: {
        ['bar' as Name]: {
          by: 'baz' as Name,
          resolved: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'baz' as Name},
        },
      },
      star: true,
      modulePath: 'spec/foo.ts',
      resolvedThroughStar: {
        ['read' as Name]: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'read' as Name},
      },
    },
    ['node:fs' as RawPath]: {
      start,
      end,
      namespaces: {
        ['fs' as Name]: {resolved: {kind: 'namespace from package', packagePath: 'node:fs'}},
      },
      star: true,
      packagePath: 'node:fs',
    },
  },
  reexportedPackages: {'node:fs': {['node:fs' as RawPath]: true}},
  sourceData,
  reexportedModules: {'spec/foo.ts': {['./foo.js' as RawPath]: true}},
  reexportedByModules: {'spec/foo.ts': {['./bar.js' as RawPath]: true}},
  expectedExports: {['bar' as Name]: {'spec/foo.ts': 'reexport'}},
};

export const expectedBazModule: Module<number> = {
  path: 'spec/baz.ts',
  uncompletedDependenciesCount,
  defaultExport: {start, end, by: 'default' as Name, from: './qux.js' as RawPath},
  imports: {
    ['./qux.js' as RawPath]: {
      start,
      end,
      default: 'qux' as Name,
      modulePath: 'spec/qux.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  exports: {
    ['baz' as Name]: {start, end, kind: 'const'},
    ['destructuringFoo' as Name]: {start, end, kind: 'destructuring const'},
    ['destructuringBar' as Name]: {start, end, kind: 'destructuring const'},
  },
  reexports: {
    ['./qux.js' as RawPath]: {
      start,
      end,
      default: 'default' as Name,
      modulePath: 'spec/qux.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  sourceData,
  importedByModules: {
    'spec/index.spec.ts': {['./baz' as RawPath]: true},
    'spec/foo.ts': {['./baz.js' as RawPath]: true},
    'spec/qux.ts': {['./baz.js' as RawPath]: true},
  },
  expectedExports: {
    ['baz' as Name]: {'spec/foo.ts': 'both'},
    ['destructuringFoo' as Name]: {'spec/qux.ts': 'import'},
    ['destructuringBar' as Name]: {'spec/qux.ts': 'import'},
  },
  expectedDefaultExport: {'spec/foo.ts': 'both'},
  reexportedByModules: {'spec/foo.ts': {['./baz.js' as RawPath]: true}},
  importedModules: {'spec/qux.ts': {['./qux.js' as RawPath]: true}},
  reexportedModules: {'spec/qux.ts': {['./qux.js' as RawPath]: true}},
};

export const expectedFooModule: Module<number> = {
  path: 'spec/foo.ts',
  uncompletedDependenciesCount,
  warnings: {
    '0': "Duplicate (namespace) import from `node:assert`:\nimport assert, * as asAssert from 'node:assert';\nDuplicate default import `assert` from `node:assert`:\nimport assert, * as asAssert from 'node:assert';",
    '1': "Duplicate named import from `./baz.js`:\nimport {baz as asBaz} from './baz.js';",
    '2': "Duplicate (namespace) import from `./baz.js`:\nimport alsoDefault, * as asAlsoDefault from './baz.js';\nDuplicate default import `alsoDefault` from `./baz.js`:\nimport alsoDefault, * as asAlsoDefault from './baz.js';",
    '3': "Duplicate (star) reexport from `./bar.js`:\nexport * from './bar.js';",
    '4': "Duplicate (namespace) reexport from `./bar.js`:\nexport * as Bar from './bar.js';",
    '5': "Duplicate named reexport from `./baz.js`:\nexport {baz as default} from './baz.js';",
  },
  defaultExport: {start, end, by: 'baz' as Name, from: './baz.js' as RawPath},
  imports: {
    ['node:assert' as RawPath]: {
      start,
      end,
      default: 'defaultFromPackage' as Name,
      namespace: {as: 'asAssert' as Name, kind: 'import'},
      packagePath: 'node:assert',
      resolvedDefault: {kind: 'default from package', packagePath: 'node:assert'},
    },
    ['node:assert/strict' as RawPath]: {
      start,
      end,
      names: {
        ['ok' as Name]: {
          as: 'asOk' as Name,
          resolved: {
            kind: 'name from package',
            name: 'ok' as Name,
            packagePath: 'node:assert/strict',
          },
        },
      },
      packagePath: 'node:assert/strict',
    },
    ['./baz.js' as RawPath]: {
      start,
      end,
      default: 'asDefault' as Name,
      names: {
        ['baz' as Name]: {
          as: 'asBaz' as Name,
          resolved: {kind: 'name', modulePath: 'spec/baz.ts', name: 'baz' as Name},
        },
      },
      namespace: {as: 'asAlsoDefault' as Name, kind: 'import'},
      modulePath: 'spec/baz.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  exports: {
    ['baz' as Name]: {from: './bar.js' as RawPath, kind: 'reexport', by: 'bar' as Name},
    ['asDefault' as Name]: {from: './baz.js' as RawPath, kind: 'reexport', by: 'default' as Name},
    ['Bar' as Name]: {from: './bar.js' as RawPath, kind: 'reexport', namespace: true},
  },
  reexports: {
    ['./bar.js' as RawPath]: {
      start,
      end,
      names: {
        ['baz' as Name]: {
          by: 'bar' as Name,
          resolved: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'baz' as Name},
        },
      },
      namespaces: {['Bar' as Name]: {resolved: {kind: 'namespace', modulePath: 'spec/bar.ts'}}},
      star: true,
      modulePath: 'spec/bar.ts',
      resolvedThroughStar: {
        ['foo' as Name]: {kind: 'name', modulePath: 'spec/bar.ts', name: 'foo' as Name},
        ['fs' as Name]: {kind: 'namespace from package', packagePath: 'node:fs'},
        ['read' as Name]: {kind: 'from packages', name: 'read' as Name, packagesPaths: ['node:fs']},
      },
    },
    ['./baz.js' as RawPath]: {
      start,
      end,
      default: 'baz' as Name,
      names: {
        ['asDefault' as Name]: {
          by: 'default' as Name,
          resolved: {kind: 'default', modulePath: 'spec/qux.ts'},
        },
      },
      modulePath: 'spec/baz.ts',
      resolvedDefault: {kind: 'name', modulePath: 'spec/baz.ts', name: 'baz' as Name},
    },
  },
  importedPackages: {
    'node:assert': {['node:assert' as RawPath]: true},
    'node:assert/strict': {['node:assert/strict' as RawPath]: true},
  },
  sourceData,
  importedByModules: {'spec/index.spec.ts': {['./foo.js' as RawPath]: true}},
  expectedExports: {
    ['Bar' as Name]: {'spec/index.spec.ts': 'import'},
    ['baz' as Name]: {'spec/index.spec.ts': 'import', 'spec/bar.ts': 'reexport'},
    ['foo' as Name]: {'spec/index.spec.ts': 'import'},
    ['fs' as Name]: {'spec/index.spec.ts': 'import'},
    ['read' as Name]: {'spec/index.spec.ts': 'import'},
  },
  expectedDefaultExport: {'spec/index.spec.ts': 'import'},
  importedModules: {'spec/baz.ts': {['./baz.js' as RawPath]: true}},
  reexportedModules: {
    'spec/baz.ts': {['./baz.js' as RawPath]: true},
    'spec/bar.ts': {['./bar.js' as RawPath]: true},
  },
  reexportedByModules: {'spec/bar.ts': {['./foo.js' as RawPath]: true}},
};
