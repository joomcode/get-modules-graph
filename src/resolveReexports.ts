import {resolveImport} from './resolveImport.js';

import type {Graph, Module, Name, RawPath} from './types';

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
    const reexportObject = reexports[rawPath as RawPath]!;

    if (reexportObject.isSkipped || reexportObject.moduleResolveError !== undefined) {
      continue;
    }

    const {modulePath, names, namespaces, packagePath} = reexportObject;

    if (packagePath !== undefined) {
      for (const name in names) {
        const nameObject = names[name as Name]!;

        if (nameObject.resolved !== undefined) {
          continue;
        }

        const {by = name as Name} = nameObject;

        nameObject.resolved =
          by === 'default'
            ? {kind: 'default from package', packagePath}
            : {kind: 'name from package', name: by, packagePath};
      }

      for (const name in namespaces) {
        const namespaceObject = namespaces[name as Name]!;

        if (namespaceObject.resolved !== undefined) {
          continue;
        }

        namespaceObject.resolved = {kind: 'namespace from package', packagePath};
      }

      if (reexportObject.default !== undefined && reexportObject.resolvedDefault === undefined) {
        if (reexportObject.default === 'default') {
          reexportObject.resolvedDefault = {kind: 'default from package', packagePath};
        } else if (reexportObject.default === '*') {
          reexportObject.resolvedDefault = {kind: 'namespace from package', packagePath};
        } else {
          reexportObject.resolvedDefault = {
            kind: 'name from package',
            name: reexportObject.default,
            packagePath,
          };
        }
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
      const nameObject = names[name as Name]!;

      if (nameObject.resolved !== undefined) {
        continue;
      }

      const {by = name as Name} = nameObject;

      nameObject.resolved = resolveImport<SourceData, DependenciesData>(
        graph,
        reexportedModule,
        by,
      );
    }

    for (const name in namespaces) {
      const namespaceObject = namespaces[name as Name]!;

      if (namespaceObject.resolved !== undefined) {
        continue;
      }

      namespaceObject.resolved = {kind: 'namespace', modulePath};
    }

    if (reexportObject.default !== undefined && reexportObject.resolvedDefault === undefined) {
      if (reexportObject.default === '*') {
        reexportObject.resolvedDefault = {kind: 'namespace', modulePath};
      } else {
        reexportObject.resolvedDefault = resolveImport<SourceData, DependenciesData>(
          graph,
          reexportedModule,
          reexportObject.default,
        );
      }
    }
  }
};
