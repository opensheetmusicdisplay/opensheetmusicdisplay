These files are custom patches for the currently installed vexflow version.
They are copied by the npm prebuild script to ../../node_modules/vexflow/src/ before a build.

stavevolta.js:
Fix the length of voltas for first measures in a system
(whose lengths were wrongly extended by the width of the clef, key signature, etc. (beginInstructions) in Vexflow 1.2.93)

tabnote.js:
Add a context group for each tabnote, so that it can be found in the SVG DOM ("vf-tabnote")

Currently, we are using Vexflow 1.2.93, because of some formatter advantages
compared to Vexflow 3.x versions.
Because of that, we need to patch in a few fixes that came after 1.2.93.

All the current fixes are already merged into the Vexflow repository.