import {addWarning} from './utils.js';

import type {Context, ExcludeUndefined, Module, Name, PackagePath, RawPath} from './types';

/**
 * Processes import of package by raw import `from` path and package path.
 */
export const processImportPackage = (
  {packages}: Context,
  module: Module,
  rawPath: RawPath,
  packagePath: PackagePath,
): void => {
  var importedPackage = packages[packagePath];

  importedPackage ??= packages[packagePath] = {path: packagePath};

  const importObject = module.imports![rawPath]!;

  importObject.packagePath = packagePath;

  var {importedPackages} = module;

  importedPackages ??= module.importedPackages = {__proto__: null} as ExcludeUndefined<
    typeof importedPackages
  >;

  var importsRawPaths = importedPackages[packagePath];

  importsRawPaths ??= importedPackages[packagePath] = {__proto__: null} as ExcludeUndefined<
    typeof importsRawPaths
  >;

  importsRawPaths[rawPath] = true;

  var {importedByModules} = importedPackage;

  importedByModules ??= importedPackage.importedByModules = {__proto__: null} as ExcludeUndefined<
    typeof importedByModules
  >;

  var importsByRawPaths = importedByModules[module.path];

  importsByRawPaths ??= importedByModules[module.path] = {__proto__: null} as ExcludeUndefined<
    typeof importsByRawPaths
  >;

  importsByRawPaths[rawPath] = true;

  var {expectedExports} = importedPackage;

  expectedExports ??= importedPackage.expectedExports = {__proto__: null} as ExcludeUndefined<
    typeof expectedExports
  >;

  for (const name in importObject.names) {
    let expectedExport = expectedExports[name as Name];

    expectedExport ??= expectedExports[name as Name] = {__proto__: null} as ExcludeUndefined<
      typeof expectedExport
    >;

    if (module.path in expectedExport) {
      if (expectedExport[module.path] === 'reexport') {
        expectedExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate import of \`${name}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          importObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'import';
    }
  }

  if ('default' in importObject) {
    let {expectedDefaultExport} = importedPackage;

    expectedDefaultExport ??= importedPackage.expectedDefaultExport = {
      __proto__: null,
    } as ExcludeUndefined<typeof expectedDefaultExport>;

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'reexport') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default import \`${importObject.default}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          importObject.start,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'import';
    }
  }
};
