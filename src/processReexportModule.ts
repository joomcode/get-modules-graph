import {completeDependency} from './completeDependency.js';
import {processResolvedPath} from './processResolvedPath.js';
import {addWarning} from './utils.js';

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

    completeDependency(context, module);

    return;
  }

  reexportObject.modulePath = reexportedModule.path;

  if (reexportedModule.uncompletedDependenciesCount === 0) {
    completeDependency(context, module);
  }

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

  const actualExports = reexportedModule.exports || {__proto__: null};

  let hasStarReexport = false;

  for (const rawPath in reexportedModule.reexports) {
    if (reexportedModule.reexports[rawPath]!.star) {
      hasStarReexport = true;
      break;
    }
  }

  for (const name in reexportObject.names) {
    const {by = name} = reexportObject.names[name]!;

    if (by === 'default') {
      let {expectedDefaultExport} = reexportedModule;

      if (expectedDefaultExport === undefined) {
        reexportedModule.expectedDefaultExport = expectedDefaultExport = {
          __proto__: null,
        } as Exclude<typeof expectedDefaultExport, undefined>;
      }

      if (module.path in expectedDefaultExport) {
        if (expectedDefaultExport[module.path] === 'import') {
          expectedDefaultExport[module.path] = 'both';
        } else {
          addWarning(
            module,
            `Duplicate default reexport (as \`${name}\`) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
            reexportObject.start,
          );
        }
      } else {
        expectedDefaultExport[module.path] = 'reexport';
      }

      if (reexportedModule.defaultExport === undefined) {
        reexportObject.names[name]!.resolved = 'error';
      }

      continue;
    }

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
          `Duplicate reexport of \`${by}\` (as \`${name}\`) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }

    if (hasStarReexport === false && !(by in actualExports)) {
      reexportObject.names[name]!.resolved = 'error';
    }
  }

  if (reexportObject.default === 'default') {
    let {expectedDefaultExport} = reexportedModule;

    if (expectedDefaultExport === undefined) {
      reexportedModule.expectedDefaultExport = expectedDefaultExport = {
        __proto__: null,
      } as Exclude<typeof expectedDefaultExport, undefined>;
    }

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'import') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default reexport (as default) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedDefaultExport[module.path] = 'reexport';
    }

    if (reexportedModule.defaultExport === undefined) {
      reexportObject.resolvedDefault = 'error';
    }
  } else if ('default' in reexportObject) {
    const by: Name = reexportObject.default;

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
          `Duplicate reexport of \`${by}\` (as default) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject.start,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }

    if (hasStarReexport === false && !(by in actualExports)) {
      reexportObject.resolvedDefault = 'error';
    }
  }
};
