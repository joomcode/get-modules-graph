import {addWarning} from './utils.js';

import type {Context, ExcludeUndefined, Module, Name, PackagePath, RawPath} from './types';

/**
 * Processes reexport of package by raw import `from` path and package path.
 */
export const processReexportPackage = (
  {packages}: Context,
  module: Module,
  rawPath: RawPath,
  packagePath: PackagePath,
): void => {
  var reexportedPackage = packages[packagePath];

  reexportedPackage ??= packages[packagePath] = {
    expectedDefaultExport: undefined,
    expectedExports: undefined,
    importedByModules: undefined,
    path: packagePath,
    reexportedByModules: undefined,
  };

  const reexportObject = module.reexports![rawPath]!;

  reexportObject.packagePath = packagePath;

  var {reexportedPackages} = module;

  reexportedPackages ??= module.reexportedPackages = {__proto__: null} as ExcludeUndefined<
    typeof reexportedPackages
  >;

  var reexportsRawPaths = reexportedPackages[packagePath];

  reexportsRawPaths ??= reexportedPackages[packagePath] = {__proto__: null} as ExcludeUndefined<
    typeof reexportsRawPaths
  >;

  reexportsRawPaths[rawPath] = true;

  var {reexportedByModules} = reexportedPackage;

  reexportedByModules ??= reexportedPackage.reexportedByModules = {
    __proto__: null,
  } as ExcludeUndefined<typeof reexportedByModules>;

  var reexportsByRawPaths = reexportedByModules[module.path];

  reexportsByRawPaths ??= reexportedByModules[module.path] = {__proto__: null} as ExcludeUndefined<
    typeof reexportsByRawPaths
  >;

  reexportsByRawPaths[rawPath] = true;

  var {expectedExports} = reexportedPackage;

  expectedExports ??= reexportedPackage.expectedExports = {__proto__: null} as ExcludeUndefined<
    typeof expectedExports
  >;

  for (const name in reexportObject.names) {
    const {by = name as Name} = reexportObject.names[name as Name]!;
    let expectedExport = expectedExports[by];

    expectedExport ??= expectedExports[name as Name] = {__proto__: null} as ExcludeUndefined<
      typeof expectedExport
    >;

    if (module.path in expectedExport) {
      if (expectedExport[module.path] === 'import') {
        expectedExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate reexport of \`${by}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          reexportObject,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }
  }

  if ('default' in reexportObject) {
    let {expectedDefaultExport} = reexportedPackage;

    expectedDefaultExport ??= reexportedPackage.expectedDefaultExport = {
      __proto__: null,
    } as ExcludeUndefined<typeof expectedDefaultExport>;

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'import') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default reexport \`${reexportObject.default}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          reexportObject,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'reexport';
    }
  }
};
