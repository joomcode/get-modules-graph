import {join, parse} from 'node:path';

import {processModule} from './processModule.js';
import {readDirectory} from './utils.js';

import type {Context, DirectoryPath, Module, ResolvedPath} from './types';

/**
 * Processes resolved path to module.
 */
export const processResolvedPath = async (
  context: Context,
  resolvedPath: ResolvedPath,
): Promise<Module | Error> => {
  const {chooseIndexModule, chooseModule, directories, resolvedPaths} = context;

  if (resolvedPath in resolvedPaths) {
    return resolvedPaths[resolvedPath]!;
  }

  let resolve: ((module: Module | Error) => void) | undefined;

  resolvedPaths[resolvedPath] = new Promise<Module | Error>((res) => {
    resolve = res;
  });

  const parsedPath = parse(resolvedPath);

  let directoryPath: DirectoryPath = parsedPath.dir;
  let directoryContent = await readDirectory(directoryPath, directories);

  if (directoryContent instanceof Error) {
    resolvedPaths[resolvedPath] = directoryContent;
    resolve!(directoryContent);

    return directoryContent;
  }

  let moduleName = chooseModule(resolvedPath, parsedPath, directoryContent);

  if (!(moduleName in directoryContent)) {
    const error = new Error(
      `Chosen module \`${moduleName}\` is not an entry of directory \`${directoryPath}\` for resolved path \`${resolvedPath}\``,
    );

    resolvedPaths[resolvedPath] = error;
    resolve!(error);

    return error;
  }

  if (directoryContent[moduleName]!.isDirectory()) {
    directoryPath = join(directoryPath, moduleName);
    directoryContent = await readDirectory(directoryPath, directories);

    if (directoryContent instanceof Error) {
      resolvedPaths[resolvedPath] = directoryContent;
      resolve!(directoryContent);

      return directoryContent;
    }

    moduleName = chooseIndexModule(resolvedPath, directoryPath, directoryContent);

    if (!(moduleName in directoryContent) || directoryContent[moduleName]!.isFile() === false) {
      const error = new Error(
        `Chosen index module \`${moduleName}\` is not a file in directory \`${directoryPath}\` for resolved path \`${resolvedPath}\``,
      );

      resolvedPaths[resolvedPath] = error;
      resolve!(error);

      return error;
    }
  } else if (directoryContent[moduleName]!.isFile() === false) {
    const error = new Error(
      `Chosen module \`${moduleName}\` is not a file or directory in directory \`${directoryPath}\` for resolved path \`${resolvedPath}\``,
    );

    resolvedPaths[resolvedPath] = error;
    resolve!(error);

    return error;
  }

  const modulePath = join(directoryPath, moduleName);

  const module = await processModule(context, modulePath);

  resolvedPaths[resolvedPath] = module;
  resolve!(module);

  return module;
};
