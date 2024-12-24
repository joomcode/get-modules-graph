import {addWarning} from './utils.js';

import type {Context, Module, PackagePath, RawPath} from './types';

/**
 * Processes reexport of package by raw import `from` path and package path.
 */
export const processReexportPackage = (
  {packages}: Context,
  module: Module,
  rawPath: RawPath,
  packagePath: PackagePath,
): void => {
  let reexportedPackage = packages[packagePath];

  if (reexportedPackage === undefined) {
    packages[packagePath] = reexportedPackage = {path: packagePath};
  }

  const reexportObject = module.reexports![rawPath]!;

  reexportObject.packagePath = packagePath;

  let {reexportedPackages} = module;

  if (reexportedPackages === undefined) {
    module.reexportedPackages = reexportedPackages = {__proto__: null} as Exclude<
      typeof reexportedPackages,
      undefined
    >;
  }

  let reexportsRawPaths = reexportedPackages[packagePath];

  if (reexportsRawPaths === undefined) {
    reexportedPackages[packagePath] = reexportsRawPaths = {__proto__: null} as Exclude<
      typeof reexportsRawPaths,
      undefined
    >;
  }

  reexportsRawPaths[rawPath] = true;

  let {reexportedByModules} = reexportedPackage;

  if (reexportedByModules === undefined) {
    reexportedPackage.reexportedByModules = reexportedByModules = {__proto__: null} as Exclude<
      typeof reexportedByModules,
      undefined
    >;
  }

  let reexportsByRawPaths = reexportedByModules[module.path];

  if (reexportsByRawPaths === undefined) {
    reexportedByModules[module.path] = reexportsByRawPaths = {__proto__: null} as Exclude<
      typeof reexportsByRawPaths,
      undefined
    >;
  }

  reexportsByRawPaths[rawPath] = true;

  let {expectedExports} = reexportedPackage;

  if (expectedExports === undefined) {
    reexportedPackage.expectedExports = expectedExports = {__proto__: null} as Exclude<
      typeof expectedExports,
      undefined
    >;
  }

  for (const name in reexportObject.names) {
    const {by = name} = reexportObject.names[name]!;
    let expectedExport = expectedExports[by];

    if (expectedExport === undefined) {
      expectedExports[name] = expectedExport = {__proto__: null} as Exclude<
        typeof expectedExport,
        undefined
      >;
    }

    if (module.path in expectedExport) {
      if (expectedExport[module.path] === 'import') {
        expectedExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate reexport of \`${by}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }
  }

  if ('default' in reexportObject) {
    let {expectedDefaultExport} = reexportedPackage;

    if (expectedDefaultExport === undefined) {
      reexportedPackage.expectedDefaultExport = expectedDefaultExport = {
        __proto__: null,
      } as Exclude<typeof expectedDefaultExport, undefined>;
    }

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'import') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default reexport \`${reexportObject.default}\` from \`${rawPath}\` (resolved as package \`${packagePath}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'reexport';
    }
  }
};
