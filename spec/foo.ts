import {default as defaultFromPackage} from 'node:assert';
import {ok as asOk} from 'node:assert/strict';
import assert, * as asAssert from 'node:assert';

import {default as asDefault} from './baz';
import {baz as asBaz} from './baz';
import alsoDefault, * as asAlsoDefault from './baz';

export * from './bar';
export * as Bar from './bar';
export {bar as baz} from './bar';

export {default as asDefault} from './baz';
export {baz as default} from './baz';

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
