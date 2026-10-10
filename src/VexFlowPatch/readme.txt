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
keep a breath mark at the time of its note: not moved with the note's x_shift (which getModifierStartXY() adds, see stavenote.js)
count the text line of an articulation also from the bases of the articulations on its side of the other voices' notes at
  its time (getTextLineBaseY(), with the move out of the staff), so that the articulations of two voices don't overlap
getExtent(): the box of the articulation as draw() renders it (its y now from getRenderY()), so that OSMD's slurs can start
  and end beyond the articulations of their notes before drawing

beam.js (custom addition):
fix beam slopes changing on each re-render (render() call)
add flat_beams, flat_beam_offset, flat_beam_offset_per_beam render_option (fixed in vexflow 4)
able to add svg node id+class to beam (not yet in vexflow 4)
fix beam not covering last note's stem: fix end X position to use Stem.WIDTH instead of hardcoded 1 (#1593)

clef.js (merged vexflow 4):
open group to get SVG group+class for clef

font/vexflow_font.js (merged vexflow 4):
add glyphs for whole and half rests with ledger lines (#1142)
  note that custom_glyphs.js is not used in the build, so it's unnecessary to modify it.

formatter.js:
comment out unnecessary error thrown, which prevents the fix to
  layouting improvements with whole measure rests and e.g. 12/8 rhythm in #1187.
  (custom addition, unnecessary in vexflow 4)
fix x set to NaN when totalTicks = 0 (bugfix for some tab scores, not sure if fixed in vexflow 4)

gracenotegroup.js (custom addition, needs check if necessary in vexflow 4):
check for gracenotegroup.spacing set, to allow e.g. spacing = 0 by default.
(with previous default 4, spacing is way too large unnecessarily, in most cases)

keysignature.js (merged vexflow 4):
open group to get SVG group+class for key signature

multimeasurerest.js (custom fix, not yet merged):
Fix end_x ("right") position not adding padding / subtracting length for wide end measure barlines like repeat barline (#1329)

notehead.js (custom addition):
add stem_up_y_shift and stem_down_y_shift to shift notehead (independent of stem length)

ornament.js (custom addition):
respect Modifier.Position.BELOW in draw() (placement="below" in MusicXML)
setUpperAccidental() and setLowerAccidental() also take a list of accidentals, drawn side by side (e.g. sharp-sharp)
count the text line of an ornament from the outermost of the notes at its time with ornaments or articulations on its side,
  i.e. of all voices in the staff, not only from its own note, so that the ornaments of two voices don't overlap
format(): an ornament's accidental marks take text lines too, so that the ornament stacked on it isn't drawn beside them

pedalmarking.js (custom addition):
Add rendering options for pedals that break across systems.

renderer.js (vexflow4: need to check if possible):
CanvasContext: getContext(): use willReadFrequently option for marginal performance potential,
and for preventing chrome warning (#1242)

stave.js (merged/fixed vexflow 4):
prevent a bug where a modifier width is NaN, leading to a VexFlow error (fixed vexflow 4)
stave.setSection(section, y, xOffset = 0, fontSize = 12):
add xOffset, fontSize arguments (see stavesection.js) (merged vexflow 4.x)

stavebarline.js (custom addition):
support double_heavy barline (heavy-heavy in MusicXML)
change padding for end barlines for multimeasurerest element (#1329)

stavenote.js (custom addition):
Fix stem/flag formatting. Instead of shifting notes by default, update the stem/flag rendering to render different voices aligned.
  Only offset if a note is the same voice, same note.
  (not yet in vexflow 4, PR 1263 open)
able to add svg node id+class to stem (merged vexflow 4.x)
Save and restore noteheads (e.g. slash noteheads) in reset()
open group for ledger lines (SVG)
preFormat() and getBoundingBox(): add paddingRight variable to allow for custom right padding (e.g. for long lyrics below note)
allow notehead y_shift without shifting stem (stem_up_y_shift)
don't stagger the head of a hidden unison note (note.hiddenUnisonBaseHead, set by OSMD) beside the visible head it shares (mergeableUnison)
getModifierStartXY(): add the note's x_shift for the positions ABOVE and BELOW too (articulations, ornaments), like for RIGHT,
  so that the marks of a note moved aside from another voice's note (or of a whole-measure rest) are drawn at the note

staverepetition.js (fixed vexflow 4):
add TO_CODA enum to type() and draw()
fix x-positioning for TO_CODA and DS_AL_CODA in drawSymbolText()
fix y-shift
don't change x_shift in drawSymbolText(): every further draw of the stave moved the end texts (e.g. D.C.), alternating

stavesection.js (half-fixed vexflow 4.x, collision, box not removable):
stavesection.draw():
adjust rectangle positioning, make height depend on font size (the measured text height differs per platform, and canvas has none)
fix rehearsal marks not rendered with canvas backend in browser

stavetempo.js (custom addition):
open a context group for vf-stavetempo, and one for its subgroup vf-bpm (for just the "= 150" text node)
add drawNoteEquation() and drawNoteGroup() for complex metronome marks (note equations like swing: 8th+8th = quarter+8th under triplet bracket)
keep the leading space of the vf-bpm text in SVG (xml:space="preserve"), so that SVG shows "= 150" as far from the note as canvas
measure the "=" and the tuplet numbers of note equations by their text advance, as the layout does (canvas measureText())

stavetie.js (merged vexflow 4.x):
context opens group for stavetie, can get stavetie SVG element via getAttribute("el")
name the group after the note the tie starts at ("<id>-tie"), set with setStartNoteId(), by default the first note:
  the part of a tie continued in the next system has no first note, and was named "vf-undefined-tie" (custom addition)
renderText(): set the font before measuring the text (e.g. H, P, sl. of tab ties and slides) to center it, instead of
  measuring it in the context's current font (custom fix, vexflow 5 still measures first)

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
measureText(text, true) returns the text advance (getComputedTextLength()) as the width, like canvas measureText(), instead of the bounding box
setRawFont(): use the whole family after the size (e.g. "Times New Roman" in "10pt Times New Roman"), not only its first word

tables.js (custom addition):
add inverted triangle notehead ('TI')
use scale parameter for x tabnote, offer alternative x note glyph option

tabnote.js (merged Vexflow 3.x):
Add a context group for each tabnote, so that it can be found in the SVG DOM ("vf-tabnote")
use scale parameter for x tabnote, offer alternative x note glyph option

tabslide.js (custom fix, vexflow 5 has no font of its own for the slide text anymore):
set the font of the slide text "sl." with the key family instead of font, so it's drawn in Times (bold italic),
  instead of in the browser's fallback font for the family "undefined"

textbracket.js (custom fix):
make sure text bracket doesn't go backwards+overlap (e.g. short octave bracket)

tickcontext.js (custom fix):
preFormat(): add the x_shift of a note moved right (e.g. staggered beside another voice's note by StaveNote.format()) to
  the context's extraRightPx, so that the spacing makes room for it: the next note doesn't run into it, and a tie from it
  keeps its length

timesignature.js (fixed vexflow 4):
open group to get SVG group+class for key signature

tremolo.js (fixed vexflow 4):
Add extra_stroke_scale, y_spacing_scale
add the note's x_shift, so that the strokes cross the stem of a note moved aside from another voice's note (custom fix)

tuplet.js (vexflow 4: need to check if this option available):
Add option tuplet.RenderTupletNumber

vexflow_font.js: (custom fix):
downstem flag glyph (v9a): rotate and shift the flag so that it suits the stem better, as 1px steps don't align here)
  to shift and rotate glyphs, use src/VexFlowPatch/tools/shift_glyph.py and rorate_glyph.py

vibratobracket.js: (custom option):
add option vibratobracket.toEndOfStopStave: Render to the end of the stop note, instead of before it
add option vibratobracket.stopBeforeNote: Render up to this note, in front of its modifiers, e.g. to the note after the stop note
render to the end of the stop note without the width left of it (modifiers like accidentals and grace notes, displaced note heads)

Currently, we are using a heavily improved and customized version of Vexflow 1.2.93,
because of some formatter advantages compared to Vexflow 3.x versions, see this issue:
https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/915

Because of that, we need to patch in a few fixes that came after 1.2.93, as well as making custom additions for our needs.

For vexflow 4 state of these changes, also see PR 1139 (vexflow 4 -> develop):
https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/1139
