// Karma provides `chai` as a global. @types/chai@5 removed it.
// Must be a .ts (not .d.ts) so webpack/ts-loader has emitted output.
export {};
declare global {
  const chai: Chai.ChaiStatic;
}
