import {readFile} from 'node:fs/promises';
import {normalize} from 'node:path';

import {mergeImportsExports} from './mergeImportsExports.js';
import * as processImportModuleNamespace from './processImportModule.js';
import {processImportPackage} from './processImportPackage.js';
import * as processReexportModuleNamespace from './processReexportModule.js';
import {processReexportPackage} from './processReexportPackage.js';
import {addError, parseImportsExports, waitTasks} from './utils.js';

import type {
  Context,
  ModulePath,
  Module,
  PackagePath,
  RawPath,
  ResolvedPath,
  Source,
} from './types';

/**
 * Processes module by module path.
 */
export const processModule = async (context: Context, modulePath: ModulePath): Promise<Module> => {
  const {onAddDependencies, onAddModule, modules, parseOptions, resolvePath, transformSource} =
    context;

  if (modulePath in modules) {
    return modules[modulePath]!;
  }

  const module: Module = {
    defaultExport: undefined,
    dependenciesData: undefined,
    errors: undefined,
    expectedDefaultExport: undefined,
    expectedExports: undefined,
    exports: undefined,
    importedByModules: undefined,
    importedModules: undefined,
    importedPackages: undefined,
    imports: undefined,
    parseErrors: undefined,
    path: modulePath,
    reexportedByModules: undefined,
    reexportedModules: undefined,
    reexportedPackages: undefined,
    reexports: undefined,
    sourceData: undefined,
    uncompletedDependenciesCount: 0,
    warnings: undefined,
  };

  var resolve: ((module: Module) => void) | undefined;

  modules[modulePath] = new Promise<Module>((res) => {
    resolve = res;
  });

  const originalSource: Source = await readFile(modulePath, READ_FILE_OPTIONS).catch((error) => {
    addError(module, `Cannot read module by path \`${modulePath}\`: ${error}`);

    return '';
  });

  const transformedSource: Source = transformSource(modulePath, originalSource);

  const importsExports = parseImportsExports(transformedSource, parseOptions);

  mergeImportsExports(module, importsExports, transformedSource);

  // cannot use `uncompletedDependenciesCount > 0` instead, because `processImportModule`/`processReexportModule`
  // calls can synchronously return `uncompletedDependenciesCount` to 0
  var hasDependencies = false;
  const resolvedPaths: Record<RawPath, string | undefined> = {__proto__: null} as {};
  const tasks: Promise<unknown>[] = [];

  for (const rawPath in module.imports) {
    const importObject = module.imports[rawPath as RawPath]!;
    const resolvedPath = resolvePath(modulePath, rawPath as RawPath);

    if (resolvedPath === undefined) {
      resolvedPaths[rawPath as RawPath] = undefined;
      importObject.isSkipped = true;

      continue;
    }

    const normalizedPath: PackagePath | ResolvedPath = normalize(resolvedPath);

    resolvedPaths[rawPath as RawPath] = resolvedPath;

    if (resolvedPath[0] === '.') {
      hasDependencies = true;
      module.uncompletedDependenciesCount += 1;

      tasks.push(
        processImportModuleNamespace.processImportModule(
          context,
          module,
          rawPath as RawPath,
          normalizedPath,
        ),
      );
    } else {
      processImportPackage(context, module, rawPath as RawPath, normalizedPath);
    }
  }

  for (const rawPath in module.reexports) {
    const reexport = module.reexports[rawPath as RawPath]!;
    const resolvedPath =
      rawPath in resolvedPaths
        ? resolvedPaths[rawPath as RawPath]
        : resolvePath(modulePath, rawPath as RawPath);

    if (resolvedPath === undefined) {
      reexport.isSkipped = true;

      continue;
    }

    const normalizedPath = normalize(resolvedPath);

    if (resolvedPath[0] === '.') {
      hasDependencies = true;
      module.uncompletedDependenciesCount += 1;

      tasks.push(
        processReexportModuleNamespace.processReexportModule(
          context,
          module,
          rawPath as RawPath,
          normalizedPath,
        ),
      );
    } else {
      processReexportPackage(context, module, rawPath as RawPath, normalizedPath);
    }
  }

  waitTasks(context, tasks);

  const sourceData = onAddModule(module, transformedSource, originalSource) as
    | {then?: unknown}
    | undefined;

  if (typeof sourceData?.then === 'function') {
    return sourceData.then((data: unknown) => {
      module.sourceData = data;
      modules[modulePath] = module;
      resolve!(module);

      if (hasDependencies === false) {
        const dependenciesData = onAddDependencies(module) as {then?: unknown} | undefined;

        if (typeof dependenciesData?.then === 'function') {
          return dependenciesData.then((data: unknown) => {
            module.dependenciesData = data;

            return module;
          });
        }

        module.dependenciesData = dependenciesData;
      }

      return module;
    });
  }

  module.sourceData = sourceData;
  modules[modulePath] = module;
  resolve!(module);

  if (hasDependencies === false) {
    const dependenciesData = onAddDependencies(module) as {then?: unknown} | undefined;

    if (typeof dependenciesData?.then === 'function') {
      return dependenciesData.then((data: unknown) => {
        module.dependenciesData = data;

        return module;
      });
    }

    module.dependenciesData = dependenciesData;
  }

  return module;
};

const READ_FILE_OPTIONS = {encoding: 'utf8'} as const;
