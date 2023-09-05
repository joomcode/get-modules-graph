import {addError, addWarning, RESERVED_WORDS} from './utils';

import type {Export, Import, ImportsExports, Module, Name, RawPath, Reexport} from './types';

/**
 * Merge imports, exports and reexports of module to base module object.
 */
export const mergeImportsExports = (
  module: Module,
  {
    declarationExports,
    defaultExport,
    errors,
    namedExports,
    namedImports,
    namedReexports,
    namespaceImports,
    namespaceReexports,
    starReexports,
  }: ImportsExports,
): void => {
  if (defaultExport) {
    module.defaultExport = defaultExport;
  }

  const imports = {__proto__: null} as unknown as Record<RawPath, Import>;
  const moduleNames = {__proto__: null} as unknown as Record<Name, true>;

  for (const rawPath in namedImports) {
    const rawImports = namedImports[rawPath]!;
    const importedNames = {__proto__: null} as unknown as Exclude<Import['names'], undefined>;
    const importObject: Import = {start: rawImports[0]!.start, end: rawImports[0]!.end};

    imports[rawPath] = importObject;

    for (const rawImport of rawImports) {
      if (rawImport !== rawImports[0]) {
        addWarning(module, `Duplicate named import from \`${rawPath}\``, rawImport.start);
      }

      const {default: defaultImport, names} = rawImport;

      if (defaultImport !== undefined) {
        if (importObject.default !== undefined) {
          addWarning(
            module,
            `Duplicate default import \`${defaultImport}\` from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          importObject.default = defaultImport;
        }

        if (defaultImport in moduleNames) {
          addError(
            module,
            `Duplicate name \`${defaultImport}\` as default import from \`${rawPath}\``,
            rawImport.start,
          );
        } else if (defaultImport in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${defaultImport}\` cannot be an identifier as default import from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          moduleNames[defaultImport] = true;
        }
      }

      for (const name in names) {
        const by: Name = names[name]!.by ?? name;

        if (name in moduleNames) {
          addError(
            module,
            `Duplicate name \`${name}\` as named import from \`${rawPath}\``,
            rawImport.start,
          );
        } else if (name in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${name}\` cannot be an identifier as named import from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          moduleNames[name] = true;
        }

        if (by === 'default') {
          if (importObject.default !== undefined) {
            addWarning(
              module,
              `Duplicate default import \`${by}\` from \`${rawPath}\``,
              rawImport.start,
            );
          } else {
            importObject.default = by;
          }
        } else if (by in importedNames) {
          addWarning(
            module,
            `Duplicate imported name \`${by}\` from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          importedNames[by] = {};

          if (by !== name) {
            importedNames[by]!.as = name;
          }
        }
      }
    }

    if (Object.keys(importedNames).length > 0) {
      importObject.names = importedNames;
    }
  }

  for (const rawPath in namespaceImports) {
    const rawImports = namespaceImports[rawPath]!;
    const importObject: Import =
      rawPath in imports
        ? imports[rawPath]!
        : {start: rawImports[0]!.start, end: rawImports[0]!.end};

    for (const rawImport of rawImports) {
      if (rawPath in imports) {
        addWarning(module, `Duplicate (namespace) import from \`${rawPath}\``, rawImport.start);
      }

      const {default: defaultImport, namespace} = rawImport;

      if (defaultImport !== undefined) {
        if (importObject.default !== undefined) {
          addWarning(
            module,
            `Duplicate default import \`${defaultImport}\` from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          importObject.default = defaultImport;
        }

        if (defaultImport in moduleNames) {
          addError(
            module,
            `Duplicate name \`${defaultImport}\` as default import from \`${rawPath}\``,
            rawImport.start,
          );
        } else if (defaultImport in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${defaultImport}\` cannot be an identifier as default import from \`${rawPath}\``,
            rawImport.start,
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
          );
        } else {
          importObject.namespace = namespace;
        }

        if (namespace in moduleNames) {
          addError(
            module,
            `Duplicate name \`${namespace}\` as namespace import from \`${rawPath}\``,
            rawImport.start,
          );
        } else if (namespace in RESERVED_WORDS) {
          addError(
            module,
            `Reserved word \`${namespace}\` cannot be an identifier as namespace import from \`${rawPath}\``,
            rawImport.start,
          );
        } else {
          moduleNames[namespace] = true;
        }
      }
    }

    if (!(rawPath in imports)) {
      imports[rawPath] = importObject;
    }
  }

  const exports = {__proto__: null} as unknown as Record<Name, Export>;

  for (const name in declarationExports) {
    const declarationExport = declarationExports[name]!;

    if (name in moduleNames) {
      addError(
        module,
        `Duplicate name \`${name}\` as \`${declarationExport.kind}\` declaration export`,
        declarationExport.start,
      );
    } else if (name in RESERVED_WORDS) {
      addError(
        module,
        `Reserved word \`${name}\` cannot be an identifier as \`${declarationExport.kind}\` declaration export`,
        declarationExport.start,
      );
    } else {
      moduleNames[name] = true;
    }

    exports[name] = declarationExport;
  }

  for (const namedExport of namedExports || []) {
    for (const name in namedExport.names) {
      if (name === 'default') {
        if (module.defaultExport !== undefined) {
          addError(
            module,
            `Duplicate default export by \`${namedExport.names[name]?.by}\` in named export`,
            namedExport.start,
          );
        } else {
          module.defaultExport = {
            start: namedExport.start,
            end: namedExport.end,
            by: namedExport.names[name]?.by!,
          };
        }
      } else if (name in exports) {
        addError(module, `Duplicate exported name \`${name}\` in named export`, namedExport.start);
      } else {
        exports[name] = {
          start: namedExport.start,
          end: namedExport.end,
          kind: 'named',
          ...namedExport.names[name],
        };
      }
    }
  }

  const reexports = {__proto__: null} as unknown as Record<RawPath, Reexport>;

  for (const rawPath in namedReexports) {
    const byNames = {__proto__: null} as unknown as Record<Name, true>;
    const rawReexports = namedReexports[rawPath]!;
    const reexportedNames = {__proto__: null} as unknown as Exclude<Reexport['names'], undefined>;
    const reexportObject: Reexport = {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    reexports[rawPath] = reexportObject;

    for (const rawReexport of rawReexports) {
      if (rawReexport !== rawReexports[0]) {
        addWarning(module, `Duplicate named reexport from \`${rawPath}\``, rawReexport.start);
      }

      for (const name in rawReexport.names) {
        if (name in exports) {
          addError(
            module,
            `Duplicate exported name \`${name}\` in reexport from \`${rawPath}\``,
            rawReexport.start,
          );

          continue;
        }

        const exportObject = {
          from: rawPath,
          kind: 'reexport',
          ...rawReexport.names[name],
        } as const;
        const by: Name = exportObject.by ?? name;

        if (name === 'default') {
          if (module.defaultExport !== undefined) {
            addError(
              module,
              `Duplicate default export by ${by} in reexport from \`${rawPath}\``,
              rawReexport.start,
            );
          } else {
            module.defaultExport = {
              start: rawReexport.start,
              end: rawReexport.end,
              by,
              from: rawPath,
            };
            reexportObject.default = by;
          }
        } else {
          exports[name] = exportObject;
          reexportedNames[name] = {};

          if (by !== name) {
            reexportedNames[name]!.by = by;
          }
        }

        if (by in byNames) {
          addWarning(
            module,
            `Duplicate reexported name \`${by}\` (as \`${name}\`) from \`${rawPath}\``,
            rawReexport.start,
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
    const rawReexports = namespaceReexports[rawPath]!;
    const reexportObject: Reexport =
      rawPath in reexports
        ? reexports[rawPath]!
        : {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    for (const {end, namespace, start} of rawReexports) {
      if (rawPath in reexports) {
        addWarning(module, `Duplicate (namespace) reexport from \`${rawPath}\``, start);
      }

      if (namespace in exports) {
        addError(
          module,
          `Duplicate exported name \`${namespace}\` (as namespace) in reexport from \`${rawPath}\``,
          start,
        );

        continue;
      }

      if (namespace === 'default') {
        if (module.defaultExport !== undefined) {
          addError(
            module,
            `Duplicate default export by namespace in reexport from \`${rawPath}\``,
            start,
          );
        } else {
          module.defaultExport = {start, end, from: rawPath, namespace: true};
          reexportObject.default = '*';
        }
      } else {
        exports[namespace] = {from: rawPath, kind: 'reexport', namespace: true};

        if (reexportObject.namespaces === undefined) {
          reexportObject.namespaces = {};
        }

        reexportObject.namespaces[namespace] = true;
      }
    }

    if (!(rawPath in reexports)) {
      reexports[rawPath] = reexportObject;
    }
  }

  for (const rawPath in starReexports) {
    const rawReexports = starReexports[rawPath]!;
    const reexportObject: Reexport =
      rawPath in reexports
        ? reexports[rawPath]!
        : {start: rawReexports[0]!.start, end: rawReexports[0]!.end};

    reexportObject.star = true;

    for (const {start} of rawReexports) {
      if (rawPath in reexports) {
        addWarning(module, `Duplicate (star) reexport from \`${rawPath}\``, start);
      }
    }

    if (!(rawPath in reexports)) {
      reexports[rawPath] = reexportObject;
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
