import {addWarning} from './utils';

import type {Context, Module, PackagePath, RawPath} from './types';

/**
 * Processes import of package by raw import `from` path and package path.
 */
export const processImportPackage = (
  {packages}: Context,
  module: Module,
  rawPath: RawPath,
  packagePath: PackagePath,
): void => {
  let importedPackage = packages[packagePath];

  if (importedPackage === undefined) {
    packages[packagePath] = importedPackage = {path: packagePath};
  }

  const importObject = module.imports![rawPath]!;

  importObject.packagePath = packagePath;

  let {importedPackages} = module;

  if (importedPackages === undefined) {
    module.importedPackages = importedPackages = {__proto__: null} as Exclude<
      typeof importedPackages,
      undefined
    >;
  }

  let importsRawPaths = importedPackages[packagePath];

  if (importsRawPaths === undefined) {
    importedPackages[packagePath] = importsRawPaths = {__proto__: null} as Exclude<
      typeof importsRawPaths,
      undefined
    >;
  }

  importsRawPaths[rawPath] = true;

  let {importedByModules} = importedPackage;

  if (importedByModules === undefined) {
    importedPackage.importedByModules = importedByModules = {__proto__: null} as Exclude<
      typeof importedByModules,
      undefined
    >;
  }

  let importsByRawPaths = importedByModules[module.path];

  if (importsByRawPaths === undefined) {
    importedByModules[module.path] = importsByRawPaths = {__proto__: null} as Exclude<
      typeof importsByRawPaths,
      undefined
    >;
  }

  importsByRawPaths[rawPath] = true;

  let {expectedExports} = importedPackage;

  if (expectedExports === undefined) {
    importedPackage.expectedExports = expectedExports = {__proto__: null} as Exclude<
      typeof expectedExports,
      undefined
    >;
  }

  for (const name in importObject.names) {
    let expectedExport = expectedExports[name];

    if (expectedExport === undefined) {
      expectedExports[name] = expectedExport = {__proto__: null} as Exclude<
        typeof expectedExport,
        undefined
      >;
    }

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

    if (expectedDefaultExport === undefined) {
      importedPackage.expectedDefaultExport = expectedDefaultExport = {__proto__: null} as Exclude<
        typeof expectedDefaultExport,
        undefined
      >;
    }

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
