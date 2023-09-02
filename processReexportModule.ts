import {processResolvedPath} from './processResolvedPath';
import {addWarning} from './utils';

import type {Context, Module, Name, RawPath, ResolvedPath} from './types';

/**
 * Processes reexport of module by raw import `from` path and resolved path.
 */
export const processReexportModule = async (
  context: Context,
  module: Module,
  rawPath: RawPath,
  resolvedPath: ResolvedPath,
): Promise<void> => {
  const reexportedModule = await processResolvedPath(context, resolvedPath);
  const reexportObject = module.reexports![rawPath]!;

  if (reexportedModule instanceof Error) {
    reexportObject.moduleResolveError = reexportedModule;

    return;
  }

  reexportObject.modulePath = reexportedModule.path;

  let {reexportedModules} = module;

  if (reexportedModules === undefined) {
    module.reexportedModules = reexportedModules = {__proto__: null} as Exclude<
      typeof reexportedModules,
      undefined
    >;
  }

  let reexportsRawPaths = reexportedModules[reexportedModule.path];

  if (reexportsRawPaths === undefined) {
    reexportedModules[reexportedModule.path] = reexportsRawPaths = {__proto__: null} as Exclude<
      typeof reexportsRawPaths,
      undefined
    >;
  }

  reexportsRawPaths[rawPath] = true;

  let {reexportedByModules} = reexportedModule;

  if (reexportedByModules === undefined) {
    reexportedModule.reexportedByModules = reexportedByModules = {__proto__: null} as Exclude<
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

  let {expectedExports} = reexportedModule;

  if (expectedExports === undefined) {
    reexportedModule.expectedExports = expectedExports = {__proto__: null} as Exclude<
      typeof expectedExports,
      undefined
    >;
  }

  const actualExports = reexportedModule.exports || {};

  for (const name in reexportObject.names) {
    const by: Name = reexportObject.names[name]!.by ?? name;
    let expectedExport = expectedExports[by];

    if (expectedExport === undefined) {
      expectedExports[by] = expectedExport = {__proto__: null} as Exclude<
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
          `Duplicate reexport of \`${by}\` from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }

    if (!(by in actualExports)) {
      reexportObject.names[name]!.isExportNotFound = true;
    }
  }

  if ('default' in reexportObject) {
    let {expectedDefaultExport} = reexportedModule;

    if (expectedDefaultExport === undefined) {
      reexportedModule.expectedDefaultExport = expectedDefaultExport = {__proto__: null} as Exclude<
        typeof expectedDefaultExport,
        undefined
      >;
    }

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'import') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default reexport \`${reexportObject.default}\` from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'reexport';
    }

    if (!('defaultExport' in reexportedModule)) {
      reexportObject.isDefaultExportNotFound = true;
    }
  }
};
