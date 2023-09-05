import {addError, waitTasks} from './utils';

import type {Context, Module} from './types';

const completeNextDependency = (context: Context, modulesToComplete: Module[]): void => {
  const {errors, modules, onAddDependencies} = context;
  const tasks: Promise<void>[] = [];

  while (modulesToComplete.length > 0) {
    const module: Module & {dependenciesData?: unknown} = modulesToComplete.shift()!;

    if (module.uncompletedDependenciesCount === 0) {
      addError(
        module,
        'Unable to complete a module dependency because all of its dependencies have already been completed',
        0,
      );

      continue;
    }

    module.uncompletedDependenciesCount -= 1;

    if (module.uncompletedDependenciesCount > 0) {
      continue;
    }

    const {importedByModules, reexportedByModules} = module;

    for (const modulePath in importedByModules) {
      const parentModule = modules[modulePath];

      if (parentModule === undefined) {
        errors.push(
          new Error(`Cannot find module \`${modulePath}\` as "imported by" in \`${module.path}\``),
        );

        continue;
      }

      const importsByRawPaths = importedByModules[modulePath]!;

      if (typeof (parentModule as {then?: unknown}).then === 'function') {
        const task = (parentModule as {then: Function}).then((resolvedModule: Module) =>
          completeDependency(context, resolvedModule),
        );

        for (const _rawPath in importsByRawPaths) {
          tasks.push(task);
        }

        continue;
      }

      for (const _rawPath in importsByRawPaths) {
        modulesToComplete.push(parentModule as Module);
      }
    }

    for (const modulePath in reexportedByModules) {
      const parentModule = modules[modulePath];

      if (parentModule === undefined) {
        errors.push(
          new Error(
            `Cannot find module \`${modulePath}\` as "reexported by" in \`${module.path}\``,
          ),
        );

        continue;
      }

      const reexportsByRawPaths = reexportedByModules[modulePath]!;

      if (typeof (parentModule as {then?: unknown}).then === 'function') {
        const task = (parentModule as {then: Function}).then((resolvedModule: Module) =>
          completeDependency(context, resolvedModule),
        );

        for (const _rawPath in reexportsByRawPaths) {
          tasks.push(task);
        }

        continue;
      }

      for (const _rawPath in reexportsByRawPaths) {
        modulesToComplete.push(parentModule as Module);
      }
    }

    const dependenciesData = onAddDependencies(module) as {then?: unknown} | undefined;

    if (typeof dependenciesData?.then === 'function') {
      tasks.push(
        dependenciesData.then((data: unknown) => {
          module.dependenciesData = data;
        }),
      );
    } else {
      module.dependenciesData = dependenciesData;
    }
  }

  waitTasks(context, tasks);
};

/**
 * Completes one dependency of module.
 */
export const completeDependency = (context: Context, module: Module): void => {
  const modulesToComplete: Module[] = [module];

  completeNextDependency(context, modulesToComplete);
};
