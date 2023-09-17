import {normalize} from 'node:path';

import {processCircularDependencies} from './processCircularDependencies';
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
  transformSource,
}: Options<SourceData, DependenciesData>): Promise<Graph<SourceData, DependenciesData>> => {
  const circularDependencies: ModulePath[][] = [];
  const errors: Error[] = [];
  const modules = {__proto__: null} as unknown as Context['modules'];
  const packages = {__proto__: null} as unknown as Context['packages'];

  const graph: Graph = {
    circularDependencies,
    errors,
    modules: modules as Graph<SourceData, DependenciesData>['modules'],
    packages,
  };

  const context: Context = {
    chooseIndexModule,
    chooseModule,
    circularDependencies,
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
    transformSource,
  };

  const promise = new Promise<Graph<SourceData, DependenciesData>>((resolve) => {
    context.resolve = resolve as Context['resolve'];
  }).finally(() => processCircularDependencies(context));

  if (initialModules.length === 0) {
    context.resolve(graph);

    return promise;
  }

  const normalizedModules: readonly ModulePath[] = initialModules.map(normalize);

  const tasks = normalizedModules.map((modulePath) => processModule(context, modulePath));

  waitTasks(context, tasks);

  return promise;
};

export {resolveImports} from './resolveImports';
export {resolveReexports} from './resolveReexports';

export type {Graph, Module, Package} from './types';
