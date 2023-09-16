import {resolveImport} from './resolveImport';

import type {Graph, Module} from './types';

/**
 * Resolves all imports of module in graph of ECMAScript/TypeScript modules.
 * This function adds an `resolved` field for all imported names (and for the imported default value)
 * of all modules imported from this module, except for unresolved modules.
 * An unresolved module is either a skipped (by `resolvePath`) module or
 * a module with `moduleResolveError`.
 */
export const resolveImports = <SourceData, DependenciesData>(
  graph: Graph<SourceData, DependenciesData>,
  {imports, path}: Module<SourceData, DependenciesData>,
): void => {
  for (const rawPath in imports) {
    const importObject = imports[rawPath]!;

    if (importObject.isSkipped || importObject.moduleResolveError !== undefined) {
      continue;
    }

    const {modulePath, names, packagePath} = importObject;

    if (packagePath !== undefined) {
      for (const name in names) {
        const nameObject = names[name]!;

        if (nameObject.resolved !== undefined) {
          continue;
        }

        nameObject.resolved = {kind: 'name from package', name, packagePath};
      }

      if (importObject.default !== undefined && importObject.resolvedDefault === undefined) {
        importObject.resolvedDefault = {kind: 'default from package', packagePath};
      }

      continue;
    }

    if (modulePath === undefined) {
      throw new Error(
        `Module path is not defined for module, imported from \`${path}\` as \`${rawPath}\``,
      );
    }

    const importedModule = graph.modules[modulePath];

    if (importedModule === undefined) {
      throw new Error(
        `Cannot find module \`${modulePath}\`, imported from \`${path}\` as \`${rawPath}\``,
      );
    }

    for (const name in names) {
      const nameObject = names[name]!;

      if (nameObject.resolved !== undefined) {
        continue;
      }

      nameObject.resolved = resolveImport<SourceData, DependenciesData>(
        graph,
        importedModule,
        name,
      );
    }

    if (importObject.default !== undefined && importObject.resolvedDefault === undefined) {
      importObject.resolvedDefault = resolveImport<SourceData, DependenciesData>(
        graph,
        importedModule,
        'default',
      );
    }
  }
};
