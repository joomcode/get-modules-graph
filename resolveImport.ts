import type {Graph, Module, Name, ResolvedImport} from './types';

/**
 * Resolves one import of module in graph of ECMAScript/TypeScript modules.
 */
export const resolveImport = <SourceData, DependenciesData>(
  graph: Graph<SourceData, DependenciesData>,
  {defaultExport, path, reexports}: Module<SourceData, DependenciesData>,
  name: Name,
): ResolvedImport => {
  if (name === 'default') {
    if (defaultExport === undefined) {
      return 'error';
    }

    const {by, from: rawPath, namespace} = defaultExport;

    if (rawPath === undefined) {
      return {kind: 'default', modulePath: path};
    }

    const reexportObject = reexports?.[rawPath];

    if (reexportObject === undefined) {
      throw new Error(
        `Cannot find reexported module for raw path \`${rawPath}\` in module \`${path}\``,
      );
    }

    if ('isSkipped' in reexportObject || 'moduleResolveError' in reexportObject) {
      return 'error';
    }

    if (reexportObject.resolvedDefault !== undefined) {
      return reexportObject.resolvedDefault;
    }

    const {modulePath, packagePath} = reexportObject;

    if (packagePath !== undefined) {
      if (by !== undefined) {
        reexportObject.resolvedDefault =
          by === 'default'
            ? {kind: 'default from package', packagePath}
            : {kind: 'name from package', name: by, packagePath};

        return reexportObject.resolvedDefault;
      }

      if (namespace !== true) {
        throw new Error(
          `Incorrect default reexport from \`${rawPath}\` (package \`${packagePath}\`) in module \`${path}\``,
        );
      }

      reexportObject.resolvedDefault = {kind: 'namespace from package', packagePath};

      return reexportObject.resolvedDefault;
    }

    if (modulePath === undefined) {
      throw new Error(
        `Cannot find module path or package path in reexport from \`${rawPath}\` in module \`${path}\``,
      );
    }

    const reexportedModule = graph.modules[modulePath];

    if (reexportedModule === undefined) {
      throw new Error(
        `Cannot find module \`${modulePath}\`, reexported from \`${path}\` as \`${rawPath}\``,
      );
    }

    if (by !== undefined) {
      reexportObject.resolvedDefault = resolveImport<SourceData, DependenciesData>(
        graph,
        reexportedModule,
        by,
      );

      return reexportObject.resolvedDefault;
    }

    if (namespace !== true) {
      throw new Error(
        `Incorrect default reexport from module \`${modulePath}\` in module \`${path}\``,
      );
    }

    reexportObject.resolvedDefault = {kind: 'namespace', modulePath};

    return reexportObject.resolvedDefault;
  }

  return {kind: 'name', modulePath: path, name};
};
