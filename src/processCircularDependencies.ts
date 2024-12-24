import {completeDependency} from './completeDependency.js';

import type {Context, Module, ModulePath} from './types';

/**
 * Processes circular dependencies in modules.
 */
export const processCircularDependencies = (context: Context): void | Promise<void> => {
  const {circularDependencies, errors, modules} = context;
  const modulesWithCircularDependencies = {__proto__: null} as unknown as Record<
    ModulePath,
    Module
  >;
  const tasks: Promise<void>[] = [];

  for (const modulePath in modules) {
    const module = modules[modulePath]!;

    if (module instanceof Promise) {
      errors.push(
        new Error(
          `Module \`${modulePath}\` still unresolved after completion of modules graph traversal`,
        ),
      );

      continue;
    }

    if (module.uncompletedDependenciesCount > 0) {
      modulesWithCircularDependencies[modulePath] = module;
    }
  }

  let modulesKeys: readonly ModulePath[];

  proccesChain: while ((modulesKeys = Object.keys(modulesWithCircularDependencies)).length > 0) {
    let currentModulePath: ModulePath = modulesKeys[0]!;

    for (let index = 1; index < modulesKeys.length; index += 1) {
      const modulePath = modulesKeys[index]!;

      if (
        modulesWithCircularDependencies[modulePath]!.uncompletedDependenciesCount <
        modulesWithCircularDependencies[currentModulePath]!.uncompletedDependenciesCount
      ) {
        currentModulePath = modulePath;
      }
    }

    const circularChain: ModulePath[] = [currentModulePath];

    for (let index = 0; index < modulesKeys.length; index += 1) {
      let isNextModuleFound = false;
      const module = modulesWithCircularDependencies[currentModulePath]!;

      for (const modulePath in module.importedModules) {
        if (modulePath in modulesWithCircularDependencies) {
          currentModulePath = modulePath;
          isNextModuleFound = true;
          break;
        }
      }

      if (isNextModuleFound === false) {
        for (const modulePath in module.reexportedModules) {
          if (modulePath in modulesWithCircularDependencies) {
            currentModulePath = modulePath;
            isNextModuleFound = true;
            break;
          }
        }
      }

      if (isNextModuleFound === false) {
        errors.push(
          new Error(
            `Cannot find next module in circular dependencies chain for module \`${currentModulePath}\``,
          ),
        );

        return;
      }

      const indexOfModule = circularChain.indexOf(currentModulePath);

      if (indexOfModule !== -1) {
        const chain = circularChain.slice(indexOfModule);

        circularDependencies.push(chain);

        let moduleWithMinimumDependencies = modulesWithCircularDependencies[chain[0]!]!;

        for (let index = 1; index < chain.length; index += 1) {
          const module = modulesWithCircularDependencies[chain[index]!]!;

          if (
            module.uncompletedDependenciesCount <
            moduleWithMinimumDependencies.uncompletedDependenciesCount
          ) {
            moduleWithMinimumDependencies = module;
          }
        }

        moduleWithMinimumDependencies.uncompletedDependenciesCount = 1;

        completeDependency(context, moduleWithMinimumDependencies, tasks);

        for (const modulePath in modulesWithCircularDependencies) {
          if (modulesWithCircularDependencies[modulePath]!.uncompletedDependenciesCount === 0) {
            delete modulesWithCircularDependencies[modulePath];
          }
        }

        continue proccesChain;
      }

      circularChain.push(currentModulePath);
    }

    errors.push(
      new Error(
        `Cannot find next chain with module \`${currentModulePath}\` in circular dependencies`,
      ),
    );

    return;
  }

  if (tasks.length > 0) {
    return Promise.all(tasks) as unknown as Promise<void>;
  }
};
