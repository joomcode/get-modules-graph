import {completeDependency} from './completeDependency.js';
import * as processResolvedPathNamespace from './processResolvedPath.js';
import {addWarning} from './utils.js';

import type {Context, ExcludeUndefined, Module, Name, RawPath, ResolvedPath} from './types';

/**
 * Processes reexport of module by raw import `from` path and resolved path.
 */
export const processReexportModule = async (
  context: Context,
  module: Module,
  rawPath: RawPath,
  resolvedPath: ResolvedPath,
): Promise<void> => {
  const reexportedModule = await processResolvedPathNamespace.processResolvedPath(
    context,
    resolvedPath,
  );
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

  var {reexportedModules} = module;

  reexportedModules ??= module.reexportedModules = {__proto__: null} as ExcludeUndefined<
    typeof reexportedModules
  >;

  var reexportsRawPaths = reexportedModules[reexportedModule.path];

  reexportsRawPaths ??= reexportedModules[reexportedModule.path] = {
    __proto__: null,
  } as ExcludeUndefined<typeof reexportsRawPaths>;

  reexportsRawPaths[rawPath] = true;

  var {reexportedByModules} = reexportedModule;

  reexportedByModules ??= reexportedModule.reexportedByModules = {
    __proto__: null,
  } as ExcludeUndefined<typeof reexportedByModules>;

  var reexportsByRawPaths = reexportedByModules[module.path];

  reexportsByRawPaths ??= reexportedByModules[module.path] = {__proto__: null} as ExcludeUndefined<
    typeof reexportsByRawPaths
  >;

  reexportsByRawPaths[rawPath] = true;

  var {expectedExports} = reexportedModule;

  expectedExports ??= reexportedModule.expectedExports = {__proto__: null} as ExcludeUndefined<
    typeof expectedExports
  >;

  const actualExports = reexportedModule.exports || {__proto__: null};

  var hasStarReexport = false;

  for (const rawPath in reexportedModule.reexports) {
    if (reexportedModule.reexports[rawPath as RawPath]!.star) {
      hasStarReexport = true;
      break;
    }
  }

  for (const name in reexportObject.names) {
    const {by = name as Name} = reexportObject.names[name as Name]!;

    if (by === 'default') {
      let {expectedDefaultExport} = reexportedModule;

      expectedDefaultExport ??= reexportedModule.expectedDefaultExport = {
        __proto__: null,
      } as ExcludeUndefined<typeof expectedDefaultExport>;

      if (module.path in expectedDefaultExport) {
        if (expectedDefaultExport[module.path] === 'import') {
          expectedDefaultExport[module.path] = 'both';
        } else {
          addWarning(
            module,
            `Duplicate default reexport (as \`${name}\`) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
            reexportObject,
          );
        }
      } else {
        expectedDefaultExport[module.path] = 'reexport';
      }

      if (reexportedModule.defaultExport === undefined) {
        reexportObject.names[name as Name]!.resolved = 'error';
      }

      continue;
    }

    let expectedExport = expectedExports[by];

    expectedExport ??= expectedExports[by] = {__proto__: null} as ExcludeUndefined<
      typeof expectedExport
    >;

    if (module.path in expectedExport) {
      if (expectedExport[module.path] === 'import') {
        expectedExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate reexport of \`${by}\` (as \`${name}\`) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject,
        );
      }
    } else {
      expectedExport[module.path] = 'reexport';
    }

    if (hasStarReexport === false && !(by in actualExports)) {
      reexportObject.names[name as Name]!.resolved = 'error';
    }
  }

  if (reexportObject.default === 'default') {
    let {expectedDefaultExport} = reexportedModule;

    expectedDefaultExport ??= reexportedModule.expectedDefaultExport = {
      __proto__: null,
    } as ExcludeUndefined<typeof expectedDefaultExport>;

    if (module.path in expectedDefaultExport) {
      if (expectedDefaultExport[module.path] === 'import') {
        expectedDefaultExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate default reexport (as default) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject,
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

    expectedExport ??= expectedExports[by] = {__proto__: null} as ExcludeUndefined<
      typeof expectedExport
    >;

    if (module.path in expectedExport) {
      if (expectedExport[module.path] === 'import') {
        expectedExport[module.path] = 'both';
      } else {
        addWarning(
          module,
          `Duplicate reexport of \`${by}\` (as default) from \`${rawPath}\` (resolved as module \`${reexportedModule.path}\`)`,
          reexportObject,
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
