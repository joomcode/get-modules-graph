import {addError, addWarning, RESERVED_WORDS} from './utils.js';

import type {
  ExcludeUndefined,
  Export,
  Import,
  ImportsExports,
  Module,
  Name,
  RawPath,
  Reexport,
} from './types';

/**
 * Merge imports, exports and reexports of module to base module object.
 */
export const mergeImportsExports = (
  module: Module,
  {
    declarationExports,
    defaultExport,
    dynamicImports,
    errors,
    namedExports,
    namedImports,
    namedReexports,
    namespaceImports,
    namespaceReexports,
    requires,
    starReexports,
  }: ImportsExports,
  source: string,
): void => {
  if (defaultExport) {
    module.defaultExport = defaultExport;
  }

  const imports = {__proto__: null} as unknown as Record<RawPath, Import>;
  const moduleNames = {__proto__: null} as unknown as Record<Name, true>;

  for (const rawPath in namedImports) {
    const rawImports = namedImports[rawPath as RawPath]!;
    const importedNames = {__proto__: null} as unknown as ExcludeUndefined<Import['names']>;
    const importObject: Import = {start: rawImports[0]!.start, end: rawImports[0]!.end};

    imports[rawPath as RawPath] = importObject;

    for (const rawImport of rawImports) {
      if (rawImport !== rawImports[0]) {
        addWarning(
          module,
          `Duplicate named import from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      }

      const {default: defaultImport, names} = rawImport;

      if (defaultImport !== undefined) {
        if (importObject.default !== undefined) {
          addWarning(
            module,
            `Duplicate default import \`${defaultImport}\` from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          importObject.default = defaultImport;
        }

        if (defaultImport in moduleNames) {
          addError(
            module,
            `Duplicate name \`${defaultImport}\` as default import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else if (defaultImport in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${defaultImport}\` cannot be an identifier as default import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          moduleNames[defaultImport] = true;
        }
      }

      for (const name in names) {
        const {by = name as Name} = names[name as Name]!;

        if (name in moduleNames) {
          addError(
            module,
            `Duplicate name \`${name}\` as named import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else if (name in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${name}\` cannot be an identifier as named import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          moduleNames[name as Name] = true;
        }

        if (by === 'default') {
          if (importObject.default !== undefined) {
            addWarning(
              module,
              `Duplicate default import (as \`${name}\`) from \`${rawPath}\``,
              rawImport.start,
              rawImport.end,
              source,
            );
          } else {
            importObject.default = name as Name;
          }
        } else if (by in importedNames) {
          addWarning(
            module,
            `Duplicate imported name \`${by}\` from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          importedNames[by] = {};

          if (by !== name) {
            importedNames[by]!.as = name as Name;
          }
        }
      }
    }

    if (Object.keys(importedNames).length > 0) {
      importObject.names = importedNames;
    }
  }

  for (const rawPath in namespaceImports) {
    const rawImports = namespaceImports[rawPath as RawPath]!;
    const importObject: Import =
      rawPath in imports
        ? imports[rawPath as RawPath]!
        : {start: rawImports[0]!.start, end: rawImports[0]!.end};

    for (const rawImport of rawImports) {
      if (rawPath in imports) {
        addWarning(
          module,
          `Duplicate (namespace) import from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      }

      const {default: defaultImport, namespace} = rawImport;

      if (defaultImport !== undefined) {
        if (importObject.default !== undefined) {
          addWarning(
            module,
            `Duplicate default import \`${defaultImport}\` from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          importObject.default = defaultImport;
        }

        if (defaultImport in moduleNames) {
          addError(
            module,
            `Duplicate name \`${defaultImport}\` as default import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else if (defaultImport in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${defaultImport}\` cannot be an identifier as default import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          moduleNames[defaultImport] = true;
        }
      }

      if (namespace !== undefined) {
        if (importObject.namespace !== undefined) {
          addWarning(
            module,
            `Duplicate namespace import \`${namespace}\` from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          importObject.namespace = {as: namespace, kind: 'import'};
        }

        if (namespace in moduleNames) {
          addError(
            module,
            `Duplicate name \`${namespace}\` as namespace import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else if (namespace in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${namespace}\` cannot be an identifier as namespace import from \`${rawPath}\``,
            rawImport.start,
            rawImport.end,
            source,
          );
        } else {
          moduleNames[namespace] = true;
        }
      }
    }

    if (!(rawPath in imports)) {
      imports[rawPath as RawPath] = importObject;
    }
  }

  for (const rawPath in dynamicImports) {
    const rawImports = dynamicImports[rawPath as RawPath]!;
    const importObject: Import =
      rawPath in imports
        ? imports[rawPath as RawPath]!
        : {start: rawImports[0]!.start, end: rawImports[0]!.end};

    for (const rawImport of rawImports) {
      if (rawPath in imports) {
        addWarning(
          module,
          `Duplicate (dynamic) import from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      }

      if (importObject.namespace !== undefined) {
        addWarning(
          module,
          `Duplicate dynamic import from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      } else {
        importObject.namespace = {kind: 'dynamic import'};
      }
    }

    if (!(rawPath in imports)) {
      imports[rawPath as RawPath] = importObject;
    }
  }

  for (const rawPath in requires) {
    const rawImports = requires[rawPath as RawPath]!;
    const importObject: Import =
      rawPath in imports
        ? imports[rawPath as RawPath]!
        : {start: rawImports[0]!.start, end: rawImports[0]!.end};

    for (const rawImport of rawImports) {
      if (rawPath in imports) {
        addWarning(
          module,
          `Duplicate (require) import from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      }

      if (importObject.namespace !== undefined) {
        addWarning(
          module,
          `Duplicate require from \`${rawPath}\``,
          rawImport.start,
          rawImport.end,
          source,
        );
      } else {
        importObject.namespace = {kind: 'require'};
      }
    }

    if (!(rawPath in imports)) {
      imports[rawPath as RawPath] = importObject;
    }
  }

  const exports = {__proto__: null} as unknown as Record<Name, Export>;

  for (const name in declarationExports) {
    const declarationExport = declarationExports[name as Name]!;

    if (declarationExport.kind.startsWith('declare')) {
      continue;
    }

    if (name in moduleNames) {
      addError(
        module,
        `Duplicate name \`${name}\` as \`${declarationExport.kind}\` declaration export`,
        declarationExport.start,
        declarationExport.end,
        source,
      );
    } else if (name in RESERVED_WORDS) {
      addError(
        module,
        `Reserved word \`${name}\` cannot be an identifier as \`${declarationExport.kind}\` declaration export`,
        declarationExport.start,
        declarationExport.end,
        source,
      );
    } else {
      moduleNames[name as Name] = true;
    }

    exports[name as Name] = declarationExport as (typeof exports)[Name];
  }

  for (const namedExport of namedExports || []) {
    for (const name in namedExport.names) {
      if (name === 'default') {
        if (module.defaultExport !== undefined) {
          addError(
            module,
            `Duplicate default export by \`${namedExport.names[name as Name]?.by}\` in named export`,
            namedExport.start,
            namedExport.end,
            source,
          );
        } else {
          module.defaultExport = {
            start: namedExport.start,
            end: namedExport.end,
            by: namedExport.names[name as Name]?.by!,
          };
        }
      } else if (name in exports) {
        addError(
          module,
          `Duplicate exported name \`${name}\` in named export`,
          namedExport.start,
          namedExport.end,
          source,
        );
      } else {
        exports[name as Name] = {
          start: namedExport.start,
          end: namedExport.end,
          kind: 'name',
          ...namedExport.names[name as Name],
        };
      }
    }
  }

  const reexports = {__proto__: null} as unknown as Record<RawPath, Reexport>;

  for (const rawPath in namedReexports) {
    const byNames = {__proto__: null} as unknown as Record<Name, true>;
    const rawReexports = namedReexports[rawPath as RawPath]!;
    const reexportedNames = {__proto__: null} as unknown as ExcludeUndefined<Reexport['names']>;
    const reexportObject: Reexport = {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    reexports[rawPath as RawPath] = reexportObject;

    for (const rawReexport of rawReexports) {
      if (rawReexport !== rawReexports[0]) {
        addWarning(
          module,
          `Duplicate named reexport from \`${rawPath}\``,
          rawReexport.start,
          rawReexport.end,
          source,
        );
      }

      for (const name in rawReexport.names) {
        if (name in exports) {
          addError(
            module,
            `Duplicate exported name \`${name}\` in reexport from \`${rawPath}\``,
            rawReexport.start,
            rawReexport.end,
            source,
          );

          continue;
        }

        const exportObject: Export = {
          from: rawPath as RawPath,
          kind: 'reexport',
          ...rawReexport.names[name as Name],
        } as const;
        const {by = name as Name} = exportObject;

        if (name === 'default') {
          if (module.defaultExport !== undefined) {
            addError(
              module,
              `Duplicate default export by \`${by}\` in reexport from \`${rawPath}\``,
              rawReexport.start,
              rawReexport.end,
              source,
            );
          } else {
            module.defaultExport = {
              start: rawReexport.start,
              end: rawReexport.end,
              by,
              from: rawPath as RawPath,
            };
            reexportObject.default = by;
          }
        } else {
          exports[name as Name] = exportObject;
          reexportedNames[name as Name] = {};

          if (by !== name) {
            reexportedNames[name as Name]!.by = by;
          }
        }

        if (by in byNames) {
          addWarning(
            module,
            `Duplicate reexported name \`${by}\` (as \`${name}\`) from \`${rawPath}\``,
            rawReexport.start,
            rawReexport.end,
            source,
          );
        } else {
          byNames[by] = true;
        }
      }
    }

    if (Object.keys(reexportedNames).length > 0) {
      reexportObject.names = reexportedNames;
    }
  }

  for (const rawPath in namespaceReexports) {
    const rawReexports = namespaceReexports[rawPath as RawPath]!;
    const reexportObject: Reexport =
      rawPath in reexports
        ? reexports[rawPath as RawPath]!
        : {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    for (const {end, namespace, start} of rawReexports) {
      if (rawPath in reexports) {
        addWarning(
          module,
          `Duplicate (namespace) reexport from \`${rawPath}\``,
          start,
          end,
          source,
        );
      }

      if (namespace in exports) {
        addError(
          module,
          `Duplicate exported name \`${namespace}\` (as namespace) in reexport from \`${rawPath}\``,
          start,
          end,
          source,
        );

        continue;
      }

      if (namespace === 'default') {
        if (module.defaultExport !== undefined) {
          addError(
            module,
            `Duplicate default export by namespace in reexport from \`${rawPath}\``,
            start,
            end,
            source,
          );
        } else {
          module.defaultExport = {start, end, from: rawPath as RawPath, namespace: true};
          reexportObject.default = '*' as Name;
        }
      } else {
        exports[namespace] = {from: rawPath as RawPath, kind: 'reexport', namespace: true};

        reexportObject.namespaces ??= {__proto__: null} as ExcludeUndefined<
          typeof reexportObject.namespaces
        >;

        reexportObject.namespaces[namespace] = {};
      }
    }

    if (!(rawPath in reexports)) {
      reexports[rawPath as RawPath] = reexportObject;
    }
  }

  for (const rawPath in starReexports) {
    const rawReexports = starReexports[rawPath as RawPath]!;
    const reexportObject: Reexport =
      rawPath in reexports
        ? reexports[rawPath as RawPath]!
        : {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    reexportObject.star = true;

    for (const {start, end} of rawReexports) {
      if (rawPath in reexports) {
        addWarning(module, `Duplicate (star) reexport from \`${rawPath}\``, start, end, source);
      }
    }

    if (!(rawPath in reexports)) {
      reexports[rawPath as RawPath] = reexportObject;
    }
  }

  if (Object.keys(imports).length > 0) {
    module.imports = imports;
  }

  if (Object.keys(exports).length > 0) {
    module.exports = exports;
  }

  if (Object.keys(reexports).length > 0) {
    module.reexports = reexports;
  }

  if (errors !== undefined) {
    module.parseErrors = errors;
  }
};
