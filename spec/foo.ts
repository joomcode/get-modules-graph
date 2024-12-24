import {default as defaultFromPackage} from 'node:assert';
import {ok as asOk} from 'node:assert/strict';
import assert, * as asAssert from 'node:assert';

import {default as asDefault} from './baz.js';
import {baz as asBaz} from './baz.js';
import alsoDefault, * as asAlsoDefault from './baz.js';

export * from './bar.js';
export * as Bar from './bar.js';
export {bar as baz} from './bar.js';

export {default as asDefault} from './baz.js';
export {baz as default} from './baz.js';

`
export default 0;
`;

export type Type = typeof asDefault &
  typeof asOk &
  typeof asAlsoDefault &
  typeof asAssert &
  typeof asBaz &
  typeof assert &
  typeof alsoDefault &
  typeof defaultFromPackage;
