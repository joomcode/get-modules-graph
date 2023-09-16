export * from 'node:fs';

export * as fs from 'node:fs';

export * from './foo';

// @ts-expect-error
export {baz as bar} from './foo';

export const foo = 3;
