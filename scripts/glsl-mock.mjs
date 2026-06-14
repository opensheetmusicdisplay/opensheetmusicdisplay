export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.glsl')) {
    return {
      url: new URL('glsl-stub', import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url === new URL('glsl-stub', import.meta.url).href) {
    return {
      format: 'module',
      source: 'export default "";',
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
