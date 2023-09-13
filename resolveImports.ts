import {resolveImport} from './resolveImport';

import type {Graph, Module} from './types';

/**
 * Resolves all imports of module in graph of ECMAScript/TypeScript modules.
 */
export const resolveImports = <SourceData, DependenciesData>(
  graph: Graph<SourceData, DependenciesData>,
  {imports, path}: Module<SourceData, DependenciesData>,
): void => {
  for (const rawPath in imports) {
    const importObject = imports[rawPath]!;

    if ('moduleResolveError' in importObject || 'isSkipped' in importObject) {
      continue;
    }

    const {modulePath, names, packagePath} = importObject;

    if (packagePath !== undefined) {
      for (const name in names) {
        const nameObject = names[name]!;

        if ('resolved' in nameObject) {
          continue;
        }

        nameObject.resolved = {kind: 'name from package', name, packagePath};
      }

      if ('default' in importObject && !('resolvedDefault' in importObject)) {
        importObject.resolvedDefault = {kind: 'default from package', packagePath};
      }

      return;
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

      if ('resolved' in nameObject) {
        continue;
      }

      nameObject.resolved = resolveImport<SourceData, DependenciesData>(
        graph,
        importedModule,
        name,
      );
    }

    if ('default' in importObject && !('resolvedDefault' in importObject)) {
      importObject.resolvedDefault = resolveImport<SourceData, DependenciesData>(
        graph,
        importedModule,
        'default',
      );
    }
  }
};
