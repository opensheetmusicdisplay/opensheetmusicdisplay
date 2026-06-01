// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Balazs Forian-Szabo
//
// ## Description
//
// This file implements `VibratoBrackets`
// that renders vibrato effect between two notes.

import { Vex } from './vex';
import { Element } from './element';
import { Vibrato } from './vibrato';

// To enable logging for this class. Set `Vex.Flow.VibratoBracket.DEBUG` to `true`.
function L(...args) { if (VibratoBracket.DEBUG) Vex.L('Vex.Flow.VibratoBracket', args); }

export class VibratoBracket extends Element {
  // bracket_data = {
  //   start: Vex.Flow.Note (optional)
  //   stop: Vex.Flow.Note (optional)
  // };
  // Either the stop or start note must be set, or both of them.
  // A null value for the start or stop note indicates that the vibrato
  // is drawn from the beginning or until the end of the stave accordingly.
  constructor(bracket_data) {
    super();
    this.setAttribute('type', 'VibratoBracket');

    this.start = bracket_data.start;
    this.stop = bracket_data.stop;
    //VexFlowPatch: Needed an option to render to the end of the stop note stave vs. the stop note itself
    this.toEndOfStopStave = bracket_data.toEndOfStopStave;

    this.line = 1;

    this.render_options = {
      harsh: false,
      wave_height: 6,
      wave_width: 4,
      wave_girth: 2,
    };
  }

  // Set line position of the vibrato bracket
  setLine(line) { this.line = line; return this; }
  setHarsh(harsh) { this.render_options.harsh = harsh; return this; }

  // Draw the vibrato bracket on the rendering context
  draw() {
    const ctx = this.context;
    this.setRendered();
    const y = (this.start)
      ? this.start.getStave().getYForTopText(this.line)
      : this.stop.getStave().getYForTopText(this.line);

    // If start note is not set then vibrato will be drawn
    // from the beginning of the stave
    let start_x = 0;
    if(this.start) {
        let trillOffset = 0;
        // VexFlowPatch: If we have a trill mark accompanying, need to allow space for it
        for(const modifier of this.start.modifiers) {
          if(modifier && modifier.type === "tr") {
            trillOffset = modifier.glyph.bbox.w;
            break;
          }
        }
        start_x = this.start.getNoteHeadBeginX ? this.start.getNoteHeadBeginX() : this.start.getAbsoluteX();
        start_x += trillOffset;
    } else {
        start_x = this.stop.getStave().getTieStartX();
    }
    // If stop note is not set then vibrato will be drawn
    // until the end of the stave
    let stop_x = 0;

    if(this.stop) {
      stop_x = (this.toEndOfStopStave) ?
        this.stop.getStave().getTieEndX() - 10 :
        // VexFlowPatch: Render to the end of the stop note, instead of before it
        this.stop.getAbsoluteX() + this.stop.getWidth()
    } else {
      stop_x = this.start.getStave().getTieEndX() - 10;
    }

    this.render_options.vibrato_width = stop_x - start_x;

    L('Rendering VibratoBracket: start_x:', start_x, 'stop_x:', stop_x, 'y:', y);

    Vibrato.renderVibrato(ctx, start_x, y, this.render_options);
  }
}