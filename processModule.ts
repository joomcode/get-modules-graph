import {readFile} from 'node:fs/promises';
import {normalize} from 'node:path';

import {parseImportsExports} from 'parse-imports-exports';

import {mergeImportsExports} from './mergeImportsExports';
import {processImportModule} from './processImportModule';
import {processImportPackage} from './processImportPackage';
import {processReexportModule} from './processReexportModule';
import {processReexportPackage} from './processReexportPackage';
import {addError, waitTasks} from './utils';

import type {Context, ModulePath, Module, PackagePath, RawPath, ResolvedPath} from './types';

const READ_FILE_OPTIONS = {encoding: 'utf8'} as const;

/**
 * Processes module by module path.
 */
export const processModule = async (context: Context, modulePath: ModulePath): Promise<Module> => {
  const {onAddDependencies, onAddModule, modules, resolvePath} = context;

  if (modulePath in modules) {
    return modules[modulePath]!;
  }

  const module: Module & {dependenciesData?: unknown; sourceData?: unknown} = {
    path: modulePath,
    uncompletedDependenciesCount: 0,
  };

  let resolve: ((module: Module) => void) | undefined;

  modules[modulePath] = new Promise<Module>((res) => {
    resolve = res;
  });

  const source = await readFile(modulePath, READ_FILE_OPTIONS).catch((error) => {
    addError(module, `Cannot read module by path \`${modulePath}\`: ${error}`, 0);

    return '';
  });

  const importsExports = parseImportsExports(source);

  mergeImportsExports(module, importsExports);

  // cannot use `uncompletedDependenciesCount > 0` instead, because `processImportModule`/`processReexportModule`
  // calls can synchronously return `uncompletedDependenciesCount` to 0
  let hasDependencies = false;
  const resolvedPaths: Record<RawPath, string | undefined> = {__proto__: null} as {};
  const tasks: Promise<unknown>[] = [];

  for (const rawPath in module.imports) {
    const importObject = module.imports[rawPath]!;
    const resolvedPath = resolvePath(modulePath, rawPath);

    if (resolvedPath === undefined) {
      resolvedPaths[rawPath] = undefined;
      importObject.isSkipped = true;

      continue;
    }

    const normalizedPath: PackagePath | ResolvedPath = normalize(resolvedPath);

    resolvedPaths[rawPath] = resolvedPath;

    if (resolvedPath[0] === '.') {
      hasDependencies = true;
      module.uncompletedDependenciesCount += 1;

      tasks.push(processImportModule(context, module, rawPath, normalizedPath));
    } else {
      processImportPackage(context, module, rawPath, normalizedPath);
    }
  }

  for (const rawPath in module.reexports) {
    const reexport = module.reexports[rawPath]!;
    const resolvedPath =
      rawPath in resolvedPaths ? resolvedPaths[rawPath] : resolvePath(modulePath, rawPath);

    if (resolvedPath === undefined) {
      reexport.isSkipped = true;

      continue;
    }

    const normalizedPath = normalize(resolvedPath);

    if (resolvedPath[0] === '.') {
      hasDependencies = true;
      module.uncompletedDependenciesCount += 1;

      tasks.push(processReexportModule(context, module, rawPath, normalizedPath));
    } else {
      processReexportPackage(context, module, rawPath, normalizedPath);
    }
  }

  waitTasks(context, tasks);

  const sourceData = onAddModule(module, source) as {then?: unknown} | undefined;

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
