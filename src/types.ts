import type {Dirent} from 'node:fs';
import type {ParsedPath} from 'node:path';

import type {
  ImportsExports,
  Kind as DeclarationExportKind,
  Options as ParseOptions,
} from 'parse-imports-exports';

/**
 * Context of graph traversal process for internal functions.
 */
export type Context = Readonly<{
  chooseIndexModule: Options['chooseIndexModule'];
  chooseModule: Options['chooseModule'];
  circularDependencies: ModulePath[][];
  directories: Record<DirectoryPath, DirectoryContent | Error | Promise<DirectoryContent | Error>>;
  errors: Error[];
  graph: Graph;
  modules: Record<ModulePath, Module | Promise<Module>>;
  onAddDependencies: Options['onAddDependencies'];
  onAddModule: Options['onAddModule'];
  packages: Packages;
  parseOptions: ParseOptions | undefined;
  resolvePath: Options['resolvePath'];
  resolvedPaths: Record<ModulePath, Module | Error | Promise<Module | Error>>;
  tasks: (Promise<unknown> | undefined)[];
  transformSource: Options['transformSource'];
}> & {completedTasksCount: number; resolve: (graph: Graph) => void};

/**
 * Content of directory as hash object.
 * Each directory entry lies in the hash under its own name
 * with its `Dirent` (from `node:fs`) type object as a value.
 */
export type DirectoryContent = Record<string, Dirent>;

/**
 * Exact relative path to directory from current working directory.
 */
export type DirectoryPath = string;

/**
 * One export name.
 */
export type Export =
  | (Position & {kind: Exclude<DeclarationExportKind, `declare ${string}`>})
  | (Position & {by?: Name; kind: 'name'})
  | {by?: Name; from: RawPath; kind: 'reexport'; namespace?: true};

/**
 * Mutable base type of modules graph.
 */
export type Graph<SourceData = unknown, DependenciesData = unknown> = {
  circularDependencies: readonly (readonly ModulePath[])[];
  errors: readonly Error[];
  modules: Record<ModulePath, Module<SourceData, DependenciesData>>;
  packages: Packages;
};

/**
 * Object with imports from one module.
 */
export type Import = Position & {
  default?: Name;
  isSkipped?: true;
  modulePath?: ModulePath;
  moduleResolveError?: Error;
  namespace?: {as: Name; kind: 'import'} | {kind: 'dynamic import' | 'require'};
  names?: Record<Name, {as?: Name; resolved?: ResolvedImport}>;
  packagePath?: PackagePath;
  resolvedDefault?: ResolvedImport;
};

export type {ImportsExports, ParseOptions};

/**
 * Merged imports, exports and reexports of module.
 */
export type MergedImportsExports = {
  defaultExport?: DefaultExport;
  exports?: Record<Name, Export>;
  imports?: Record<RawPath, Import>;
  reexports?: Record<RawPath, Reexport>;
};

/**
 * Processed module (with optional dependencies).
 */
export type Module<SourceData = unknown, DependenciesData = unknown> = {
  errors?: Record<number, string>;
  expectedDefaultExport?: Record<ModulePath, ExpectedExportKind>;
  expectedExports?: Record<Name, Record<ModulePath, ExpectedExportKind>>;
  importedByModules?: Record<ModulePath, Record<RawPath, true>>;
  importedModules?: Record<ModulePath, Record<RawPath, true>>;
  importedPackages?: Record<PackagePath, Record<RawPath, true>>;
  path: ModulePath;
  parseErrors?: Record<number, string>;
  reexportedByModules?: Record<ModulePath, Record<RawPath, true>>;
  reexportedModules?: Record<ModulePath, Record<RawPath, true>>;
  reexportedPackages?: Record<PackagePath, Record<RawPath, true>>;
  uncompletedDependenciesCount: number;
  warnings?: Record<number, string>;
} & MergedImportsExports &
  (IsEqual<DependenciesData, unknown> extends true ? {} : {dependenciesData: DependenciesData}) &
  (IsEqual<SourceData, unknown> extends true ? {} : {sourceData: SourceData});

/**
 * Exact relative path to module from current working directory (with extension).
 */
export type ModulePath = string;

/**
 * Chain of modules used to prevent hangs due to circular calls when resolving reexports.
 */
export type ModulesChain = Readonly<{
  modulePath: ModulePath;
  name: Name;
  next: ModulesChain | undefined;
}>;

/**
 * Returns a copy of the object type with mutable properties.
 * `Mutable<{readonly foo: string}>` = `{foo: string}`.
 */
export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

/**
 * Imported or exported name (identifier).
 */
export type Name = string;

/**
 * Options of `getModulesGraph` function.
 */
export type Options<SourceData = unknown, DependenciesData = unknown> = Readonly<{
  /**
   * Chooses an index module in a directory by the resolved path and directory path.
   * Throws an error if a directory and not a file is selected.
   */
  chooseIndexModule: (
    this: void,
    resolvedPath: ResolvedPath,
    directoryPath: DirectoryPath,
    directoryContent: DeepReadonly<DirectoryContent>,
  ) => string;
  /**
   * Chooses a module (or directory) in a directory by the resolved path
   * to a module in that directory.
   * If a directory is chosen, the choosing process will continue in a `chooseIndexModule` call
   * already for the contents of that chosen directory.
   */
  chooseModule: (
    this: void,
    resolvedPath: ResolvedPath,
    parsedPath: ParsedPath,
    directoryContent: DeepReadonly<DirectoryContent>,
  ) => string;
  /**
   * List of relative paths to directories for recursive traversal in depth
   * and by their dependencies.
   */
  directories: readonly string[];
  /**
   * If `true`, then `import(...)` expression with static strings will be taken into account
   * (as importing the namespace of the entire module).
   */
  includeDynamicImports: boolean;
  /**
   * If `true`, then `require(...)` expression with static strings will be taken into account
   * (as importing the namespace of the entire module).
   */
  includeRequires: boolean;
  /**
   * List of relative paths to modules for recursive traversal by their dependencies.
   */
  modules: readonly string[];
  /**
   * The callback on completing (adding) dependencies to a module.
   * Called when all module dependencies have been recursively completed.
   * Always called before the `onAddModule` callback.
   * Should return the data obtained from the dependencies of the module,
   * which will be stored in the `dependenciesData` module field.
   */
  onAddDependencies: (
    this: void,
    module: DeepReadonly<Module<SourceData>>,
  ) => DependenciesData | Promise<DependenciesData>;
  /**
   * The callback on adding a module. Called as soon as the module has been parsed
   * and added to the module graph (without its own dependencies).
   * Should return the data obtained from the source code of the module,
   * which will be stored in the `sourceData` module field.
   */
  onAddModule: (
    this: void,
    module: DeepReadonly<Module>,
    transformedSource: Source,
    originalSource: Source,
  ) => SourceData | Promise<SourceData>;
  /**
   * Resolves raw path to dependency module (after the `from` keyword) to relative path
   * from current working directory or to bare path to the package.
   * The returned relative path to the module must begin with a dot,
   * otherwise it will be considered the path to the package.
   * The returned path must use `path.sep` as path segment separator.
   * If returns `undefined`, dependency module is skipped.
   */
  resolvePath: (this: void, modulePath: ModulePath, rawPath: RawPath) => ResolvedPath | undefined;
  /**
   * If `true`, then we respect string literals when parsing, that is,
   * we ignore the expressions inside them (but parsing will be a little slower).
   */
  respectStringLiterals: boolean;
  /**
   * If returns `true`, directory is skipped in recursive directories traversal.
   */
  skipDirectory: (this: void, directoryPath: DirectoryPath, directoryName: string) => boolean;
  /**
   * If returns `true`, module is skipped in recursive directories traversal.
   */
  skipModule: (this: void, modulePath: ModulePath, moduleName: string) => boolean;
  /**
   * Transforms source of module.
   */
  transformSource: (this: void, modulePath: ModulePath, source: Source) => Source;
}>;

/**
 * Processed package.
 */
export type Package = {
  expectedDefaultExport?: Record<ModulePath, ExpectedExportKind>;
  expectedExports?: Record<Name, Record<ModulePath, ExpectedExportKind>>;
  importedByModules?: Record<ModulePath, Record<RawPath, true>>;
  path: PackagePath;
  reexportedByModules?: Record<ModulePath, Record<RawPath, true>>;
};

/**
 * Bare path to package or specific module within a package prefixed by the package name.
 */
export type PackagePath = string;

/**
 * Raw path to a module or package after the `from` keyword.
 */
export type RawPath = string;

/**
 * Object with reexports from one module.
 */
export type Reexport = Position & {
  default?: Name;
  isSkipped?: true;
  modulePath?: ModulePath;
  moduleResolveError?: Error;
  names?: Record<Name, {by?: Name; resolved?: ResolvedImport}>;
  namespaces?: Record<Name, {resolved?: ResolvedImport}>;
  packagePath?: PackagePath;
  resolvedDefault?: ResolvedImport;
  resolvedThroughStar?: Record<Name, ResolvedImport>;
  star?: true;
};

/**
 * Resolved import of a module, that is, information about which module or package
 * this import was from and under what name (or default, or namespace).
 */
export type ResolvedImport =
  | 'error'
  | {kind: 'circular'; modulePath: ModulePath; name: Name}
  | {kind: 'default' | 'namespace'; modulePath: ModulePath}
  | {kind: 'name'; modulePath: ModulePath; name: Name}
  | {kind: 'default from package' | 'namespace from package'; packagePath: PackagePath}
  | {kind: 'from packages'; name: Name; packagesPaths: readonly PackagePath[]}
  | {kind: 'name from package'; name: Name; packagePath: PackagePath};

/**
 * Resolved related path to module from current working directory,
 * maybe without extension.
 */
export type ResolvedPath = string;

/**
 * Source of module.
 */
export type Source = string;

/**
 * Readonly type with recursive applying.
 * `DeepReadonly<{foo: {bar: 0}}>` = `{readonly foo: {readonly bar: 0}}`.
 */
type DeepReadonly<Type> = {readonly [Key in keyof Type]: DeepReadonly<Type[Key]>};

/**
 * Default export of module.
 */
type DefaultExport = Position & {by?: Name; from?: RawPath; namespace?: true};

/**
 * Kind of expected export of module.
 */
type ExpectedExportKind = 'both' | 'import' | 'reexport';

/**
 * Returns `true` if types are exactly equal, `false` otherwise.
 * `IsEqual<{foo: string}, {foo: string}>` = `true`.
 * `IsEqual<{readonly foo: string}, {foo: string}>` = `false`.
 */
type IsEqual<X, Y> =
  (<Type>() => Type extends X ? 1 : 2) extends <Type>() => Type extends Y ? 1 : 2 ? true : false;

/**
 * Mutable packages object for internal functions.
 */
type Packages = Record<PackagePath, Package>;

/**
 * Position of import, export or reexport statement in source of module.
 */
type Position = {start: number; end: number};
