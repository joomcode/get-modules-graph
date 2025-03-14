import {normalize} from 'node:path';

import {processCircularDependencies} from './processCircularDependencies.js';
import {processModule} from './processModule.js';
import {waitTasks} from './utils.js';

import type {Context, Graph, ModulePath, Mutable, Options, ParseOptions} from './types';

/**
 * Get and traverse graph of ECMAScript/TypeScript modules.
 */
export const getModulesGraph = <SourceData = void, DependenciesData = void>({
  chooseIndexModule,
  chooseModule,
  includeDynamicImports,
  includeLineColumn,
  includeRequires,
  modules: initialModules,
  onAddDependencies,
  onAddModule,
  resolvePath,
  respectStringLiterals,
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

  const parseOptions: Mutable<ParseOptions> = {};

  if (includeDynamicImports === false) {
    parseOptions.ignoreDynamicImports = true;
  }

  if (includeLineColumn) {
    parseOptions.includeLineColumn = true;
  }

  if (includeRequires === false) {
    parseOptions.ignoreRequires = true;
  }

  if (respectStringLiterals === false) {
    parseOptions.ignoreStringLiterals = true;
  }

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
    parseOptions: Object.keys(parseOptions).length > 0 ? parseOptions : undefined,
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

export {resolveImports} from './resolveImports.js';
export {resolveReexports} from './resolveReexports.js';

export type {Graph, Module, Name, Options, Package, RawPath} from './types';
