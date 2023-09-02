import {readFile} from 'node:fs/promises';
import {normalize} from 'node:path';

import {parseImportsExports} from 'parse-imports-exports';

import {mergeImportsExports} from './mergeImportsExports';
import {processImportModule} from './processImportModule';
import {processImportPackage} from './processImportPackage';
import {processReexportModule} from './processReexportModule';
import {processReexportPackage} from './processReexportPackage';
import {waitTasks} from './utils';

import type {Context, ModulePath, Module, PackagePath, RawPath, ResolvedPath} from './types';

const READ_FILE_OPTIONS = {encoding: 'utf8'} as const;

/**
 * Processes module by module path.
 */
export const processModule = async (context: Context, modulePath: ModulePath): Promise<Module> => {
  const {onAddModule, modules, resolvePath} = context;

  if (modulePath in modules) {
    return modules[modulePath]!;
  }

  const module: Module & {sourceData?: unknown} = {path: modulePath};

  let resolve: ((module: Module) => void) | undefined;

  modules[modulePath] = new Promise<Module>((res) => {
    resolve = res;
  });

  const source = await readFile(modulePath, READ_FILE_OPTIONS).catch((error) => {
    module.errors = {0: `Cannot read module by path \`${modulePath}\`: ${error}`};

    return '';
  });

  const importsExports = parseImportsExports(source);

  mergeImportsExports(module, importsExports);

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
      tasks.push(processReexportModule(context, module, rawPath, normalizedPath));
    } else {
      processReexportPackage(context, module, rawPath, normalizedPath);
    }
  }

  waitTasks(context, tasks);

  const sourceData = onAddModule(module, source) as {then?: unknown};

  if (typeof sourceData?.then === 'function') {
    return sourceData.then((data: unknown) => {
      module.sourceData = data;
      modules[modulePath] = module;
      resolve!(module);

      return module;
    });
  }

  module.sourceData = sourceData;
  modules[modulePath] = module;
  resolve!(module);

  return module;
};
