VexFlowPatch
base vexflow version:
1.2.93

note: this patch will likely create errors when used with a different vexflow version, like 3.x
if using a different vexflow version, disable this prebuild patch script in package.json.

These files are custom patches for the currently installed vexflow version.
They are copied by the npm prebuild script to ../../node_modules/vexflow/src/ before a build.
Each .js has comments like "// VexFlowPatch: [explanation]" to indicate what was changed.
(a diff can be created from the base vexflow version)

beam.js (custom addition):
add flat_beams, flat_beam_offset, flat_beam_offset_per_beam render_option
able to add svg node id+class to beam

stave.js (custom addition):
prevent a bug where a modifier width is NaN, leading to a VexFlow error
stave.setSection(section, y, xOffset = 0, fontSize = 12):
add xOffset, fontSize arguments (see stavesection.js)

stavenote.js (custom addition):
Fix stem/flag formatting. Instead of shifting notes by default, update the stem/flag rendering to render different voices aligned.
  Only offset if a note is the same voice, same note.
able to add svg node id+class to stem

staverepetition.js (custom addition):
add TO_CODA enum to type() and draw()
fix x-positioning for TO_CODA and DS_AL_CODA in drawSymbolText()
fix y-shift

stavesection.js (custom addition):
stavesection.draw():
adjust rectangle positioning, make height depend on text height

stavetie.js (custom addition):
context opens group for stavetie, can get stavetie SVG element via getAttribute("el")

stavevolta.js (merged Vexflow 3.x):
Fix the length of voltas for first measures in a system
(whose lengths were wrongly extended by the width of the clef, key signature, etc. (beginInstructions) in Vexflow 1.2.93)

stem.js (custom addition):
able to give an id+class to the stem node in SVG

stemmablenote.js (custom addition):
Add manual flag rendering variable so we can choose not to render flags if notes are sharing a stem.

svgcontext.js (custom addition):
able to add extra attributes (like svg node id) to a stroke (e.g. stem)

tabnote.js (merged Vexflow 3.x):
Add a context group for each tabnote, so that it can be found in the SVG DOM ("vf-tabnote")

tremolo.js (custom addition):
Add extra_stroke_scale, y_spacing_scale

Currently, we are using Vexflow 1.2.93, because of some formatter advantages
compared to Vexflow 3.x versions, see this issue:
https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/915

Because of that, we need to patch in a few fixes that came after 1.2.93, as well as making custom additions for our needs.
