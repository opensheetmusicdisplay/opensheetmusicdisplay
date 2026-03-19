// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author Radosaw Eichler 2012

import { Flow } from './tables';
import { Modifier } from './modifier';
import { StaveModifier } from './stavemodifier';
import { Glyph } from './glyph';

export class StaveTempo extends StaveModifier {
  static get CATEGORY() { return 'stavetempo'; }

  constructor(tempo, x, shift_y) {
    super();
    this.setAttribute('type', 'StaveTempo');

    this.tempo = tempo;
    this.position = Modifier.Position.ABOVE;
    this.x = x;
    this.shift_x = 10;
    this.shift_y = shift_y;
    this.font = {
      family: 'times',
      size: 14,
      weight: 'bold',
    };
    this.render_options = {
      glyph_font_scale: 30,  // font size for note
    };
  }
  getCategory() { return StaveTempo.CATEGORY; }
  setTempo(tempo) { this.tempo = tempo; return this; }
  setShiftX(x) { this.shift_x = x; return this; }
  setShiftY(y) { this.shift_y = y; return this; }

  draw(stave, shift_x) {
    const ctx = stave.checkContext();
    this.setRendered();
    ctx.openGroup("stavetempo"); // VexFlowPatch: open group

    const options = this.render_options;
    // FIXME: What does the '38' mean? Why 38? Is that supposed to
    // be the default font size for standard notation?
    const scale = options.glyph_font_scale / 38;
    const name = this.tempo.name;
    const duration = this.tempo.duration;
    const dots = this.tempo.dots;
    const bpm = this.tempo.bpm;
    const noteEquation = this.tempo.noteEquation;
    const font = this.font;
    let x = this.x + this.shift_x + shift_x;
    const y = stave.getYForTopText(1) + this.shift_y;

    ctx.save();

    if (name) {
      ctx.setFont(font.family, font.size, font.weight);
      ctx.fillText(name, x, y);
      x += ctx.measureText(name).width;
    }

    if (noteEquation) {
      // Complex metronome mark: note group = note group (e.g. swing notation)
      x = this.drawNoteEquation(ctx, x, y, scale, noteEquation);
    } else if (duration && bpm) {
      ctx.setFont(font.family, font.size, 'normal');

      if (name) {
        x += ctx.measureText(' ').width;
        ctx.fillText('(', x, y);
        x += ctx.measureText('(').width;
      }

      const code = Flow.getGlyphProps(duration);

      x += 3 * scale;
      Glyph.renderGlyph(ctx, x, y, options.glyph_font_scale, code.code_head);
      x += code.getWidth() * scale;

      // Draw stem and flags
      if (code.stem) {
        let stem_height = 30;

        if (code.beam_count) stem_height += 3 * (code.beam_count - 1);

        stem_height *= scale;

        const y_top = y - stem_height;
        ctx.fillRect(x - scale, y_top, scale, stem_height);

        if (code.flag) {
          Glyph.renderGlyph(ctx, x, y_top, options.glyph_font_scale, code.code_flag_upstem);

          if (!dots) x += 6 * scale;
        }
      }

      // Draw dot
      for (let i = 0; i < dots; i++) {
        x += 6 * scale;
        ctx.beginPath();
        ctx.arc(x, y + 2 * scale, 2 * scale, 0, Math.PI * 2, false);
        ctx.fill();
      }

      ctx.openGroup("bpm"); // VexFlowPatch: open group
      ctx.fillText(' = ' + bpm + (name ? ')' : ''), x + 3 * scale, y);
      ctx.closeGroup();
    }

    ctx.closeGroup();
    ctx.restore();
    return this;
  }

  /**
   * Draw a complex metronome mark: leftNotes = rightNotes (with optional tuplet bracket).
   * noteEquation: { left: { notes: [{duration, dots, beam}], tuplet? }, right: { ... } }
   */
  drawNoteEquation(ctx, x, y, scale, noteEquation) {
    const options = this.render_options;
    const font = this.font;

    // Draw left note group
    x = this.drawNoteGroup(ctx, x, y, scale, noteEquation.left);

    // Draw "=" sign
    ctx.setFont(font.family, font.size, 'bold');
    const equalsText = ' = ';
    ctx.fillText(equalsText, x + 2 * scale, y);
    x += ctx.measureText(equalsText).width + 2 * scale;

    // Draw right note group (with optional tuplet)
    x = this.drawNoteGroup(ctx, x, y, scale, noteEquation.right);

    return x;
  }

  /**
   * Draw a group of notes (with beams connecting flagged notes, and optional tuplet bracket).
   * group: { notes: [{duration, dots, beam}], tuplet?: {actualNotes, bracket, showNumber} }
   */
  drawNoteGroup(ctx, x, y, scale, group) {
    const options = this.render_options;
    const notes = group.notes;
    const tuplet = group.tuplet;

    // Track positions for beams and tuplet bracket
    const notePositions = []; // [{x, y_top, stemX, code}]
    const beamSegments = []; // groups of notes to beam together

    let currentBeamGroup = [];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const code = Flow.getGlyphProps(note.duration);
      if (!code) continue;

      x += 3 * scale;
      const noteX = x;
      Glyph.renderGlyph(ctx, x, y, options.glyph_font_scale, code.code_head);
      x += code.getWidth() * scale;

      let stemTopY = y;
      const stemX = x;

      // Draw stem
      if (code.stem) {
        let stem_height = 30;
        // For beamed notes, use consistent stem height (don't add extra for beam_count,
        // since we draw beams manually instead of flags)
        stem_height *= scale;

        stemTopY = y - stem_height;
        ctx.fillRect(x - scale, stemTopY, scale, stem_height);

        // Only draw flags for notes that are NOT beamed
        if (code.flag && !note.beam) {
          Glyph.renderGlyph(ctx, x, stemTopY, options.glyph_font_scale, code.code_flag_upstem);
          if (!note.dots) x += 6 * scale;
        }
      }

      // Draw dots
      for (let d = 0; d < (note.dots || 0); d++) {
        x += 6 * scale;
        ctx.beginPath();
        ctx.arc(x, y + 2 * scale, 2 * scale, 0, Math.PI * 2, false);
        ctx.fill();
      }

      const pos = { x: noteX, y_top: stemTopY, stemX: stemX, code: code };
      notePositions.push(pos);

      // Track beam groups
      if (note.beam === 'begin') {
        currentBeamGroup = [pos];
      } else if (note.beam === 'continue') {
        currentBeamGroup.push(pos);
      } else if (note.beam === 'end') {
        currentBeamGroup.push(pos);
        beamSegments.push(currentBeamGroup);
        currentBeamGroup = [];
      }

      // Add spacing between notes in the group
      if (i < notes.length - 1) {
        x += 2 * scale;
      }
    }

    // Draw beams
    const beamThickness = 3 * scale;
    for (const segment of beamSegments) {
      if (segment.length < 2) continue;
      const firstStem = segment[0];
      const lastStem = segment[segment.length - 1];

      // Determine how many beam lines based on the maximum beam_count in the segment
      let maxBeamCount = 0;
      for (const pos of segment) {
        if (pos.code.beam_count) {
          maxBeamCount = Math.max(maxBeamCount, pos.code.beam_count);
        }
      }

      for (let b = 0; b < maxBeamCount; b++) {
        const beamY = firstStem.y_top + b * (beamThickness + 1 * scale);
        ctx.fillRect(
          firstStem.stemX - scale,
          beamY,
          lastStem.stemX - firstStem.stemX + scale,
          beamThickness
        );
      }
    }

    // Draw tuplet bracket and number
    if (tuplet && notePositions.length > 0) {
      const firstPos = notePositions[0];
      const lastPos = notePositions[notePositions.length - 1];

      // Find the highest (smallest y) stem top in the group
      let minY = firstPos.y_top;
      for (const pos of notePositions) {
        minY = Math.min(minY, pos.y_top);
      }

      const bracketY = minY - 6 * scale;
      const bracketStartX = firstPos.stemX - 3 * scale;
      const bracketEndX = lastPos.stemX + 3 * scale;

      if (tuplet.bracket) {
        const hookHeight = 4 * scale;
        ctx.beginPath();
        // Left hook
        ctx.moveTo(bracketStartX, bracketY + hookHeight);
        ctx.lineTo(bracketStartX, bracketY);

        // Determine the gap for the tuplet number
        const midX = (bracketStartX + bracketEndX) / 2;
        const numberText = tuplet.showNumber === 'both'
          ? `${tuplet.actualNotes}:${tuplet.normalNotes}`
          : `${tuplet.actualNotes}`;

        ctx.setFont(this.font.family, this.font.size - 3, 'bold');
        const numberWidth = ctx.measureText(numberText).width;
        const gapHalf = numberWidth / 2 + 2 * scale;

        // Line to gap
        ctx.lineTo(midX - gapHalf, bracketY);
        ctx.stroke();

        ctx.beginPath();
        // Line from gap
        ctx.moveTo(midX + gapHalf, bracketY);
        ctx.lineTo(bracketEndX, bracketY);
        // Right hook
        ctx.lineTo(bracketEndX, bracketY + hookHeight);
        ctx.stroke();

        // Draw the number
        ctx.fillText(numberText, midX - numberWidth / 2, bracketY - 1 * scale);
      } else if (tuplet.showNumber !== 'none') {
        // No bracket, just the number
        const midX = (bracketStartX + bracketEndX) / 2;
        const numberText = tuplet.showNumber === 'both'
          ? `${tuplet.actualNotes}:${tuplet.normalNotes}`
          : `${tuplet.actualNotes}`;
        ctx.setFont(this.font.family, this.font.size - 3, 'bold');
        const numberWidth = ctx.measureText(numberText).width;
        ctx.fillText(numberText, midX - numberWidth / 2, bracketY - 1 * scale);
      }
    }

    return x;
  }
}
