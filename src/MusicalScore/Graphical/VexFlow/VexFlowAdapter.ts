/**
 * The single boundary between OSMD and VexFlow's package entry points.
 *
 * OSMD supplies and awaits its own font profile, so it deliberately uses the
 * fontless VexFlow entry point. Keeping that choice here prevents renderer
 * classes from depending on a particular VexFlow distribution layout.
 */
import VexFlow from "vexflow/core";

export * from "vexflow/core";
export default VexFlow;
