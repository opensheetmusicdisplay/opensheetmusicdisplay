// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// VexFlowPatch: MusicXML <technical><arrow> (a directional or circular arrow, e.g. a guitar strum).
// Drawn as a shaft and head. The patched font has arrowheads only, not the SMuFL arrow or guitarStrum glyphs.

import { Vex } from './vex';
import { Modifier } from './modifier';
import { Stem } from './stem';

const { ABOVE, BELOW } = Modifier.Position;

/** Unit vector in canvas space (y grows downward), and whether both ends have a head. */
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  northwest: { x: -1, y: -1 },
  northeast: { x: 1, y: -1 },
  southeast: { x: 1, y: 1 },
  southwest: { x: -1, y: 1 },
  'left right': { x: 1, y: 0, both: true },
  'up down': { x: 0, y: 1, both: true },
  'northwest southeast': { x: 1, y: 1, both: true },
  'northeast southwest': { x: 1, y: -1, both: true },
};

function isStaveNote(note) {
  const category = note.getCategory();
  return category === 'stavenotes' || category === 'gracenotes';
}

/** Y the inner end of the arrow sits on: the same anchor as an articulation outside the staff. */
function anchorY(note, position, textLine) {
  const stave = note.getStave();
  const staffSpace = stave.getSpacingBetweenLines();
  const above = position === ABOVE;
  if (note.getCategory() === 'tabnotes') {
    return above
      ? stave.getYForTopText(textLine) - textLine * staffSpace
      : stave.getYForBottomText(textLine) + textLine * staffSpace;
  }
  if (!isStaveNote(note)) {
    throw new Vex.RERR('UnknownCategory', 'TechnicalArrow can only be drawn on stavenotes and tabnotes');
  }
  const stemDirection = note.hasStem() ? note.getStemDirection() : undefined;
  const onStemTip = note.hasStem() && (
    (above && stemDirection === Stem.UP) || (!above && stemDirection === Stem.DOWN)
  );
  const offset = onStemTip ? 0.5 : 1;
  const extents = note.hasStem() ? note.getStemExtents() : undefined;
  if (above) {
    const top = extents ? (stemDirection === Stem.UP ? extents.topY : extents.baseY) : Math.min(...note.getYs());
    return Math.min(stave.getYForTopText(-0.5), top - (textLine + offset) * staffSpace);
  }
  const bottom = extents ? (stemDirection === Stem.UP ? extents.baseY : extents.topY) : Math.max(...note.getYs());
  return Math.max(stave.getYForBottomText(-0.5), bottom + (textLine + offset) * staffSpace);
}

function drawHead(ctx, tipX, tipY, ux, uy, head) {
  const baseX = tipX - ux * head;
  const baseY = tipY - uy * head;
  const half = head * 0.55;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX - uy * half, baseY + ux * half);
  ctx.lineTo(baseX + uy * half, baseY - ux * half);
  ctx.closePath();
  ctx.fill();
}

export class TechnicalArrow extends Modifier {
  static get CATEGORY() { return 'technicalarrows'; }

  /**
   * @param {string} direction An `<arrow-direction>` value, or `circular-clockwise` / `circular-anticlockwise`.
   */
  constructor(direction) {
    super();
    this.setAttribute('type', 'TechnicalArrow');
    this.type = direction;
    this.position = ABOVE;
    this.direction = DIRECTIONS[direction];
    this.circular = direction === 'circular-clockwise' || direction === 'circular-anticlockwise'
      ? direction === 'circular-clockwise' : undefined;
    if (!this.direction && this.circular === undefined) {
      throw new Vex.RERR('ArgumentError', `Unknown arrow direction: ${direction}`);
    }
    this.setWidth(12);
  }

  getCategory() { return TechnicalArrow.CATEGORY; }

  static format(arrows, state) {
    if (!arrows || arrows.length === 0) return false;
    for (const arrow of arrows) {
      if (arrow.getPosition() === ABOVE) {
        arrow.setTextLine(state.top_text_line);
        state.top_text_line += 2;
      } else {
        arrow.setTextLine(state.text_line);
        state.text_line += 2;
      }
    }
    let horizontal = 0;
    for (const arrow of arrows) {
      horizontal = Math.max(horizontal, arrow.horizontalExtent());
    }
    state.left_shift += horizontal / 2;
    state.right_shift += horizontal / 2;
    return true;
  }

  /** How far the arrow sticks out to either side of the note head, in pixels. */
  horizontalExtent() {
    const space = this.note?.getStave?.()?.getSpacingBetweenLines() || 10;
    const length = space * 1.7;
    if (this.circular !== undefined) {
      return length * 0.55;
    }
    const mag = Math.hypot(this.direction.x, this.direction.y) || 1;
    return Math.abs(this.direction.x) / mag * length * 0.5 + space * 0.25;
  }

  /** Centre of the arrow, and its length, as draw() uses them. */
  layout() {
    const { note, index, position, text_line: textLine } = this;
    if (!note || index == null) {
      throw new Vex.RERR('NoAttachedNote', "Can't draw an arrow without a note and index.");
    }
    note.setStave(note.getStave());
    const stave = note.getStave();
    const staffSpace = stave.getSpacingBetweenLines();
    const length = staffSpace * 1.7;
    const above = position === ABOVE;
    let y = anchorY(note, position, textLine);
    y += above ? -length / 2 : length / 2;
    if (this.y_shift) {
      y += this.y_shift;
    }
    const { x } = note.getModifierStartXY(position, index);
    return { x, y, length, staffSpace };
  }

  getExtent() {
    const { x, y, length, staffSpace } = this.layout();
    const noteX = this.note.getModifierStartXY(this.position, this.index).x;
    let halfX;
    let halfY;
    if (this.circular !== undefined) {
      const radius = staffSpace * 0.62;
      halfX = radius;
      halfY = radius;
    } else {
      const mag = Math.hypot(this.direction.x, this.direction.y) || 1;
      const ux = this.direction.x / mag;
      const uy = this.direction.y / mag;
      const head = length * 0.22;
      halfX = Math.abs(ux) * length / 2 + Math.abs(uy) * head;
      halfY = Math.abs(uy) * length / 2 + Math.abs(ux) * head;
    }
    return {
      left: (x - noteX) - halfX,
      right: (x - noteX) + halfX,
      top: y - halfY,
      bottom: y + halfY,
    };
  }

  draw() {
    this.checkContext();
    this.setRendered();
    const ctx = this.context;
    const { x, y, length, staffSpace } = this.layout();
    ctx.openGroup('technicalarrow', undefined, { pointerBBox: true });
    ctx.save();
    ctx.setFillStyle('#000000');
    ctx.setStrokeStyle('#000000');
    ctx.setLineWidth(Math.max(1.15, staffSpace * 0.11));
    ctx.setLineCap('round');
    if (this.circular !== undefined) {
      this.drawCircular(ctx, x, y, staffSpace);
    } else {
      this.drawLinear(ctx, x, y, length);
    }
    ctx.restore();
    ctx.closeGroup();
  }

  drawLinear(ctx, x, y, length) {
    const mag = Math.hypot(this.direction.x, this.direction.y) || 1;
    const ux = this.direction.x / mag;
    const uy = this.direction.y / mag;
    const head = length * 0.42;
    const tipX = x + ux * length / 2;
    const tipY = y + uy * length / 2;
    const tailX = x - ux * length / 2;
    const tailY = y - uy * length / 2;
    ctx.beginPath();
    if (this.direction.both) {
      ctx.moveTo(tailX + ux * head, tailY + uy * head);
      ctx.lineTo(tipX - ux * head, tipY - uy * head);
    } else {
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX - ux * head, tipY - uy * head);
    }
    ctx.stroke();
    drawHead(ctx, tipX, tipY, ux, uy, head);
    if (this.direction.both) {
      drawHead(ctx, tailX, tailY, -ux, -uy, head);
    }
  }

  drawCircular(ctx, x, y, staffSpace) {
    const radius = staffSpace * 0.5;
    const clockwise = this.circular === true;
    // Canvas angles grow clockwise (y points down). Leave a gap for the head.
    const start = -Math.PI / 2;
    const sweep = (clockwise ? 1 : -1) * Math.PI * 1.7;
    const end = start + sweep;
    ctx.beginPath();
    ctx.arc(x, y, radius, start, end, !clockwise);
    ctx.stroke();
    const tipX = x + Math.cos(end) * radius;
    const tipY = y + Math.sin(end) * radius;
    // Tangent in the direction of travel.
    const tangent = clockwise ? 1 : -1;
    drawHead(ctx, tipX, tipY, -Math.sin(end) * tangent, Math.cos(end) * tangent, staffSpace * 0.42);
  }
}
