VexFlowPatch
base vexflow version:
1.2.93

note: this patch will likely create errors when used with a different vexflow version, like 3.x
if using a different vexflow version, disable this prebuild patch script in package.json.

These files are custom patches for the currently installed vexflow version.
They are copied by the npm prebuild script to ../../node_modules/vexflow/src/ before a build.
Each .js has comments like "// VexFlowPatch: [explanation]" to indicate what was changed.
(a diff can be created from the base vexflow version)

articulation.js (custom addition):
respect modifier.y_shift (y_shift affects y position of rendering)
breath mark support

beam.js (custom addition):
add flat_beams, flat_beam_offset, flat_beam_offset_per_beam render_option (fixed in vexflow 4)
able to add svg node id+class to beam (not yet in vexflow 4)

clef.js (merged vexflow 4):
open group to get SVG group+class for clef

formatter.js (custom addition, unnecessary in vexflow 4):
comment out unnecessary error thrown, which prevents the fix to
layouting improvements with whole measure rests and e.g. 12/8 rhythm in #1187.

gracenotegroup.js (custom addition, needs check if necessary in vexflow 4):
check for gracenotegroup.spacing set, to allow e.g. spacing = 0 by default.
(with previous default 4, spacing is way too large unnecessarily, in most cases)

keysignature.js (merged vexflow 4):
open group to get SVG group+class for key signature

pedalmarking.js (custom addition):
Add rendering options for pedals that break across systems.

renderer.js (vexflow4: need to check if possible):
CanvasContext: getContext(): use willReadFrequently option for marginal performance potential,
and for preventing chrome warning (#1242)

stave.js (merged/fixed vexflow 4):
prevent a bug where a modifier width is NaN, leading to a VexFlow error (fixed vexflow 4)
stave.setSection(section, y, xOffset = 0, fontSize = 12):
add xOffset, fontSize arguments (see stavesection.js) (merged vexflow 4.x)

stavenote.js (custom addition):
Fix stem/flag formatting. Instead of shifting notes by default, update the stem/flag rendering to render different voices aligned.
  Only offset if a note is the same voice, same note.
  (not yet in vexflow 4, PR 1263 open)
able to add svg node id+class to stem (merged vexflow 4.x)
Save and restore noteheads (e.g. slash noteheads) in reset()

staverepetition.js (fixed vexflow 4):
add TO_CODA enum to type() and draw()
fix x-positioning for TO_CODA and DS_AL_CODA in drawSymbolText()
fix y-shift

stavesection.js (half-fixed vexflow 4.x, collision, box not removable):
stavesection.draw():
adjust rectangle positioning, make height depend on text height
fix rehearsal marks not rendered with canvas backend in browser

stavetie.js (merged vexflow 4.x):
context opens group for stavetie, can get stavetie SVG element via getAttribute("el")

stavevolta.js (merged Vexflow 3.x):
Fix the length of voltas for first measures in a system
(whose lengths were wrongly extended by the width of the clef, key signature, etc. (beginInstructions) in Vexflow 1.2.93)

stem.js (fixed vexflow 4 (or earlier)):
able to give an id+class to the stem node in SVG

stemmablenote.js (custom addition, see stavenote.js):
Add manual flag rendering variable so we can choose not to render flags if notes are sharing a stem.

svgcontext.js (custom addition, probably not necessary for vexflow 4):
able to add extra attributes (like svg node id) to a stroke (e.g. stem)
fix rect() always using black color, ignoring attributes.stroke (ctx strokeStlye) -> fix defaultColorMusic ignored

tabnote.js (merged Vexflow 3.x):
Add a context group for each tabnote, so that it can be found in the SVG DOM ("vf-tabnote")

timesignature.js (fixed vexflow 4):
open group to get SVG group+class for key signature

tremolo.js (fixed vexflow 4):
Add extra_stroke_scale, y_spacing_scale

tuplet.js (vexflow 4: need to check if this option available):
Add option tuplet.RenderTupletNumber

Currently, we are using Vexflow 1.2.93, because of some formatter advantages
compared to Vexflow 3.x versions, see this issue:
https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/915

Because of that, we need to patch in a few fixes that came after 1.2.93, as well as making custom additions for our needs.

For vexflow 4 state of these changes, also see PR 1139 (vexflow 4 -> develop):
https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/1139
