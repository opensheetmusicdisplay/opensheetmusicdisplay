// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author Larry Kuhns 2011

import { StaveModifier } from './stavemodifier';

export class StaveSection extends StaveModifier {
  static get CATEGORY() { return 'stavesection'; }

  constructor(section, x, shift_y) {
    super();
    this.setAttribute('type', 'StaveSection');

    this.setWidth(16);
    this.section = section;
    this.x = x;
    this.shift_x = 0;
    this.shift_y = shift_y;
    this.font = {
      family: 'sans-serif',
      size: 12,
      weight: 'bold',
    };
  }

  getCategory() { return StaveSection.CATEGORY; }
  setStaveSection(section) { this.section = section; return this; }
  setShiftX(x) { this.shift_x = x; return this; }
  setShiftY(y) { this.shift_y = y; return this; }
  draw(stave, shift_x) {
    const ctx = stave.checkContext();
    this.setRendered();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.setFont(this.font.family, this.font.size, this.font.weight);
    const text_measurements = ctx.measureText('' + this.section);
    const text_width = text_measurements.width;
    let text_height = text_measurements.height;
    if (!text_height && text_measurements.emHeightAscent >= 0) { // VexFlowPatch
      text_height = text_measurements.emHeightAscent + 2; // node canvas / generateImages fix
    }
    if (!text_height) { // canvas: sometimes no height available (VexFlowPatch)
      text_height = text_measurements.fontBoundingBoxAscent + 3; // estimation
    }
    let width = text_width + 6;  // add left & right padding
    if (width < 18) width = 18;
    const height = text_height + this.font.size / 10; // font.size / 10: padding
    //  Seems to be a good default y
    const y = stave.getYForTopText(3) + 19 - (height * 1.15) + this.shift_y;
    let x = this.x + shift_x;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.rect(x, y + text_height/4, width, height);
    ctx.stroke();
    x += (width - text_width) / 2;
    ctx.fillText('' + this.section, x, y + height );
    ctx.restore();
    return this;
  }
}
