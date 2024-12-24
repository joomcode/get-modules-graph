import type {Module} from '../src';

const start = 0;
const end = 0;
const sourceData = 0;
const uncompletedDependenciesCount = 0;

export const expectedBarModule: Module<number> = {
  path: 'spec/bar.ts',
  uncompletedDependenciesCount,
  warnings: {
    '0': "Duplicate (star) reexport from `node:fs`:\nexport * from 'node:fs';",
    '1': "Duplicate (star) reexport from `./foo.js`:\nexport * from './foo.js';",
  },
  exports: {
    foo: {start, end, kind: 'const'},
    bar: {from: './foo.js', kind: 'reexport', by: 'baz'},
    fs: {from: 'node:fs', kind: 'reexport', namespace: true},
  },
  reexports: {
    './foo.js': {
      start,
      end,
      names: {
        bar: {by: 'baz', resolved: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'baz'}},
      },
      star: true,
      modulePath: 'spec/foo.ts',
      resolvedThroughStar: {read: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'read'}},
    },
    'node:fs': {
      start,
      end,
      namespaces: {fs: {resolved: {kind: 'namespace from package', packagePath: 'node:fs'}}},
      star: true,
      packagePath: 'node:fs',
    },
  },
  reexportedPackages: {'node:fs': {'node:fs': true}},
  sourceData,
  reexportedModules: {'spec/foo.ts': {'./foo.js': true}},
  reexportedByModules: {'spec/foo.ts': {'./bar.js': true}},
  expectedExports: {bar: {'spec/foo.ts': 'reexport'}},
};

export const expectedBazModule: Module<number> = {
  path: 'spec/baz.ts',
  uncompletedDependenciesCount,
  defaultExport: {start, end, by: 'default', from: './qux.js'},
  imports: {
    './qux.js': {
      start,
      end,
      default: 'qux',
      modulePath: 'spec/qux.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  exports: {
    baz: {start, end, kind: 'const'},
    destructuringFoo: {start, end, kind: 'destructuring const'},
    destructuringBar: {start, end, kind: 'destructuring const'},
  },
  reexports: {
    './qux.js': {
      start,
      end,
      default: 'default',
      modulePath: 'spec/qux.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  sourceData,
  importedByModules: {
    'spec/index.spec.ts': {'./baz': true},
    'spec/foo.ts': {'./baz.js': true},
    'spec/qux.ts': {'./baz.js': true},
  },
  expectedExports: {
    baz: {'spec/foo.ts': 'both'},
    destructuringFoo: {'spec/qux.ts': 'import'},
    destructuringBar: {'spec/qux.ts': 'import'},
  },
  expectedDefaultExport: {'spec/foo.ts': 'both'},
  reexportedByModules: {'spec/foo.ts': {'./baz.js': true}},
  importedModules: {'spec/qux.ts': {'./qux.js': true}},
  reexportedModules: {'spec/qux.ts': {'./qux.js': true}},
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
  defaultExport: {start, end, by: 'baz', from: './baz.js'},
  imports: {
    'node:assert': {
      start,
      end,
      default: 'defaultFromPackage',
      namespace: {as: 'asAssert', kind: 'import'},
      packagePath: 'node:assert',
      resolvedDefault: {kind: 'default from package', packagePath: 'node:assert'},
    },
    'node:assert/strict': {
      start,
      end,
      names: {
        ok: {
          as: 'asOk',
          resolved: {kind: 'name from package', name: 'ok', packagePath: 'node:assert/strict'},
        },
      },
      packagePath: 'node:assert/strict',
    },
    './baz.js': {
      start,
      end,
      default: 'asDefault',
      names: {
        baz: {as: 'asBaz', resolved: {kind: 'name', modulePath: 'spec/baz.ts', name: 'baz'}},
      },
      namespace: {as: 'asAlsoDefault', kind: 'import'},
      modulePath: 'spec/baz.ts',
      resolvedDefault: {kind: 'default', modulePath: 'spec/qux.ts'},
    },
  },
  exports: {
    baz: {from: './bar.js', kind: 'reexport', by: 'bar'},
    asDefault: {from: './baz.js', kind: 'reexport', by: 'default'},
    Bar: {from: './bar.js', kind: 'reexport', namespace: true},
  },
  reexports: {
    './bar.js': {
      start,
      end,
      names: {
        baz: {by: 'bar', resolved: {kind: 'circular', modulePath: 'spec/foo.ts', name: 'baz'}},
      },
      namespaces: {Bar: {resolved: {kind: 'namespace', modulePath: 'spec/bar.ts'}}},
      star: true,
      modulePath: 'spec/bar.ts',
      resolvedThroughStar: {
        foo: {kind: 'name', modulePath: 'spec/bar.ts', name: 'foo'},
        fs: {kind: 'namespace from package', packagePath: 'node:fs'},
        read: {kind: 'from packages', name: 'read', packagesPaths: ['node:fs']},
      },
    },
    './baz.js': {
      start,
      end,
      default: 'baz',
      names: {asDefault: {by: 'default', resolved: {kind: 'default', modulePath: 'spec/qux.ts'}}},
      modulePath: 'spec/baz.ts',
      resolvedDefault: {kind: 'name', modulePath: 'spec/baz.ts', name: 'baz'},
    },
  },
  importedPackages: {
    'node:assert': {'node:assert': true},
    'node:assert/strict': {'node:assert/strict': true},
  },
  sourceData,
  importedByModules: {'spec/index.spec.ts': {'./foo.js': true}},
  expectedExports: {
    Bar: {'spec/index.spec.ts': 'import'},
    baz: {'spec/index.spec.ts': 'import', 'spec/bar.ts': 'reexport'},
    foo: {'spec/index.spec.ts': 'import'},
    fs: {'spec/index.spec.ts': 'import'},
    read: {'spec/index.spec.ts': 'import'},
  },
  expectedDefaultExport: {'spec/index.spec.ts': 'import'},
  importedModules: {'spec/baz.ts': {'./baz.js': true}},
  reexportedModules: {'spec/baz.ts': {'./baz.js': true}, 'spec/bar.ts': {'./bar.js': true}},
  reexportedByModules: {'spec/bar.ts': {'./foo.js': true}},
};
