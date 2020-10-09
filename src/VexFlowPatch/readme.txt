VexFlowPatch
base vexflow version:
1.2.93

note: this patch will likely create errors when used with a different vexflow version, like 3.x
if using a different vexflow version, disable this prebuild patch script in package.json.

These files are custom patches for the currently installed vexflow version.
They are copied by the npm prebuild script to ../../node_modules/vexflow/src/ before a build.
Each .js has comments like "// VexFlowPatch: [explanation]" to indicate what was changed.
(a diff can be created from the base vexflow version)

stave.js (custom addition):
prevent a bug where a modifier width is NaN, leading to a VexFlow error

stavevolta.js (merged Vexflow 3.x):
Fix the length of voltas for first measures in a system
(whose lengths were wrongly extended by the width of the clef, key signature, etc. (beginInstructions) in Vexflow 1.2.93)

tabnote.js (merged Vexflow 3.x):
Add a context group for each tabnote, so that it can be found in the SVG DOM ("vf-tabnote")

tremolo.js (custom addition):
Add extra_stroke_scale, y_spacing_scale

Currently, we are using Vexflow 1.2.93, because of some formatter advantages
compared to Vexflow 3.x versions.
Because of that, we need to patch in a few fixes that came after 1.2.93.