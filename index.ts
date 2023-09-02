import {normalize} from 'node:path';

import {processModule} from './processModule';
import {waitTasks} from './utils';

import type {Context, Graph, ModulePath, Options} from './types';

/**
 * Get and traverse graph of ECMAScript/TypeScript modules.
 */
export const getModulesGraph = <SourceData = void, DependenciesData = void>({
  chooseIndexModule,
  chooseModule,
  modules: initialModules,
  onAddDependencies,
  onAddModule,
  resolvePath,
}: Options<SourceData, DependenciesData>): Promise<Graph<SourceData, DependenciesData>> => {
  const errors: Error[] = [];
  const modules = {__proto__: null} as unknown as Context['modules'];
  const packages = {__proto__: null} as unknown as Context['packages'];

  const graph: Graph = {errors, modules, packages};

  const context: Context = {
    chooseIndexModule,
    chooseModule,
    completedTasksCount: 0,
    directories: {__proto__: null} as unknown as Context['directories'],
    errors,
    graph,
    modules,
    onAddDependencies: onAddDependencies as Context['onAddDependencies'],
    onAddModule,
    packages,
    resolve: Object,
    resolvePath,
    resolvedPaths: {__proto__: null} as unknown as Context['resolvedPaths'],
    tasks: [],
  };

  const promise = new Promise<Graph<SourceData, DependenciesData>>((resolve) => {
    context.resolve = resolve as Context['resolve'];
  });

  const normalizedModules: readonly ModulePath[] = initialModules.map(normalize);

  const tasks = normalizedModules.map((modulePath) => processModule(context, modulePath));

  waitTasks(context, tasks);

  return promise;
};

export type {Graph, Module, Package} from './types';