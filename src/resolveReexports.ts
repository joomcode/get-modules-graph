import {resolveImport} from './resolveImport';

import type {Graph, Module} from './types';

/**
 * Resolves all reexports of module in graph of ECMAScript/TypeScript modules.
 * This function adds an `resolved` field for all reexported names (and for the reexported default value)
 * of all modules reexported from this module, except for unresolved modules.
 * An unresolved module is either a skipped (by `resolvePath`) module or
 * a module with `moduleResolveError`.
 */
export const resolveReexports = <SourceData, DependenciesData>(
  graph: Graph<SourceData, DependenciesData>,
  {path, reexports}: Module<SourceData, DependenciesData>,
): void => {
  for (const rawPath in reexports) {
    const reexportObject = reexports[rawPath]!;

    if (reexportObject.isSkipped || reexportObject.moduleResolveError !== undefined) {
      continue;
    }

    const {modulePath, names, packagePath} = reexportObject;

    if (packagePath !== undefined) {
      for (const name in names) {
        const nameObject = names[name]!;

        if (nameObject.resolved !== undefined) {
          continue;
        }

        nameObject.resolved = {kind: 'name from package', name, packagePath};
      }

      if (reexportObject.default !== undefined && reexportObject.resolvedDefault === undefined) {
        reexportObject.resolvedDefault = {kind: 'default from package', packagePath};
      }

      continue;
    }

    if (modulePath === undefined) {
      throw new Error(
        `Module path is not defined for module, reexported from \`${path}\` as \`${rawPath}\``,
      );
    }

    const reexportedModule = graph.modules[modulePath];

    if (reexportedModule === undefined) {
      throw new Error(
        `Cannot find module \`${modulePath}\`, reexported from \`${path}\` as \`${rawPath}\``,
      );
    }

    for (const name in names) {
      const nameObject = names[name]!;

      if (nameObject.resolved !== undefined) {
        continue;
      }

      nameObject.resolved = resolveImport<SourceData, DependenciesData>(
        graph,
        reexportedModule,
        name,
      );
    }

    if (reexportObject.default !== undefined && reexportObject.resolvedDefault === undefined) {
      reexportObject.resolvedDefault = resolveImport<SourceData, DependenciesData>(
        graph,
        reexportedModule,
        'default',
      );
    }
  }
};
