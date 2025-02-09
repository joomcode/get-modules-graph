import {completeDependency} from './completeDependency.js';
import * as processResolvedPathNamespace from './processResolvedPath.js';
import {addWarning} from './utils.js';

import type {Context, ExcludeUndefined, Module, Name, RawPath, ResolvedPath} from './types';

/**
 * Processes import of module by raw import `from` path and resolved path.
 */
export const processImportModule = async (
  context: Context,
  module: Module,
  rawPath: RawPath,
  resolvedPath: ResolvedPath,
): Promise<void> => {
  const importedModule = await processResolvedPathNamespace.processResolvedPath(
    context,
    resolvedPath,
  );
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

  var {importedModules} = module;

  importedModules ??= module.importedModules = {__proto__: null} as ExcludeUndefined<
    typeof importedModules
  >;

  var importsRawPaths = importedModules[importedModule.path];

  importsRawPaths ??= importedModules[importedModule.path] = {__proto__: null} as ExcludeUndefined<
    typeof importsRawPaths
  >;

  importsRawPaths[rawPath] = true;

  var {importedByModules} = importedModule;

  importedByModules ??= importedModule.importedByModules = {__proto__: null} as ExcludeUndefined<
    typeof importedByModules
  >;

  var importsByRawPaths = importedByModules[module.path];

  importsByRawPaths ??= importedByModules[module.path] = {__proto__: null} as ExcludeUndefined<
    typeof importsByRawPaths
  >;

  importsByRawPaths[rawPath] = true;

  var {expectedExports} = importedModule;

  expectedExports ??= importedModule.expectedExports = {__proto__: null} as ExcludeUndefined<
    typeof expectedExports
  >;

  const actualExports = importedModule.exports || {__proto__: null};

  var hasStarReexport = false;

  for (const rawPath in importedModule.reexports) {
    if (importedModule.reexports[rawPath as RawPath]!.star) {
      hasStarReexport = true;
      break;
    }
  }

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
          `Duplicate import of \`${name}\` from \`${rawPath}\` (resolved as module \`${importedModule.path}\`)`,
          importObject,
        );
      }
    } else {
      expectedExport[module.path] = 'import';
    }

    if (hasStarReexport === false && !(name in actualExports)) {
      importObject.names[name as Name]!.resolved = 'error';
    }
  }

  if ('default' in importObject) {
    let {expectedDefaultExport} = importedModule;

    expectedDefaultExport ??= importedModule.expectedDefaultExport = {
      __proto__: null,
    } as ExcludeUndefined<typeof expectedDefaultExport>;

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'reexport') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default import \`${importObject.default}\` from \`${rawPath}\` (resolved as module \`${importedModule.path}\`)`,
          importObject,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'import';
    }

    if (importedModule.defaultExport === undefined) {
      importObject.resolvedDefault = 'error';
    }
  }
};
