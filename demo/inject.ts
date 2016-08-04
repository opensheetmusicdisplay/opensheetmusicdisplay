import { OSMD } from "./../src/OSMD/OSMD";

/* This file injects OSMD in the window object.
 * !!! HANDLE WITH CARE !!!
 */

(window as any).OSMD = OSMD;
