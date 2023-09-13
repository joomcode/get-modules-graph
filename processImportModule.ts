import {completeDependency} from './completeDependency';
import {processResolvedPath} from './processResolvedPath';
import {addWarning} from './utils';

import type {Context, Module, RawPath, ResolvedPath} from './types';

/**
 * Processes import of module by raw import `from` path and resolved path.
 */
export const processImportModule = async (
  context: Context,
  module: Module,
  rawPath: RawPath,
  resolvedPath: ResolvedPath,
): Promise<void> => {
  const importedModule = await processResolvedPath(context, resolvedPath);
  const importObject = module.imports![rawPath]!;

  if (importedModule instanceof Error) {
    importObject.moduleResolveError = importedModule;

    completeDependency(context, module);

    return;
  }

  importObject.modulePath = importedModule.path;

  if (importedModule.uncompletedDependenciesCount === 0) {
    completeDependency(context, module);
  }

  let {importedModules} = module;

  if (importedModules === undefined) {
    module.importedModules = importedModules = {__proto__: null} as Exclude<
      typeof importedModules,
      undefined
    >;
  }

  let importsRawPaths = importedModules[importedModule.path];

  if (importsRawPaths === undefined) {
    importedModules[importedModule.path] = importsRawPaths = {__proto__: null} as Exclude<
      typeof importsRawPaths,
      undefined
    >;
  }

  importsRawPaths[rawPath] = true;

  let {importedByModules} = importedModule;

  if (importedByModules === undefined) {
    importedModule.importedByModules = importedByModules = {__proto__: null} as Exclude<
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

  let {expectedExports} = importedModule;

  if (expectedExports === undefined) {
    importedModule.expectedExports = expectedExports = {__proto__: null} as Exclude<
      typeof expectedExports,
      undefined
    >;
  }

  const actualExports = importedModule.exports || {};

  let hasStarReexport = false;

  for (const rawPath in importedModule.reexports) {
    if (importedModule.reexports[rawPath]!.star) {
      hasStarReexport = true;
      break;
    }
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
          `Duplicate import of \`${name}\` from \`${rawPath}\` (resolved as module \`${importedModule.path}\`)`,
          importObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'import';
    }

    if (hasStarReexport === false && !(name in actualExports)) {
      importObject.names[name]!.resolved = 'error';
    }
  }

  if ('default' in importObject) {
    let {expectedDefaultExport} = importedModule;

    if (expectedDefaultExport === undefined) {
      importedModule.expectedDefaultExport = expectedDefaultExport = {__proto__: null} as Exclude<
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
          `Duplicate default import \`${importObject.default}\` from \`${rawPath}\` (resolved as module \`${importedModule.path}\`)`,
          importObject.start,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'import';
    }

    if (!('defaultExport' in importedModule)) {
      importObject.resolvedDefault = 'error';
    }
  }
};
