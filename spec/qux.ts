import {destructuringFoo, destructuringBar} from './baz';

export default 42;

export type Type = typeof destructuringFoo & typeof destructuringBar;
