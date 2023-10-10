import qux from './qux';

export {default as default} from './qux';

export const baz = 0;

export type Type = typeof qux;

export const {foo: destructuringFoo, bar: destructuringBar}: {foo?: object; bar?: object} = {};
