import {destructuringFoo, destructuringBar} from './baz.js';

export default 42;

export type Type = typeof destructuringFoo & typeof destructuringBar;
