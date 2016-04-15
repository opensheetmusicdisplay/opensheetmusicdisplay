module FFT {

  // typing for the FFT npm package
  export declare class complex {
    constructor(n: number, inverse: boolean);
    public simple(output: Float64Array, input: Float64Array, type: string): void;
  }

  export function toRealImag(timeData: Float64Array): any {
    let n: number = timeData.length;
    let fft: any = new FFT.complex(n << 1, false);
    let output: Float64Array = new Float64Array(n << 1);
    let input: Float64Array = new Float64Array(n << 1);
    // copy timeData into the input array
    // FIXME: is this fix needed?
    // problem: complex transform, real timeData
    for (let i = 0; i < n; i++) {
      input[i << 1] = timeData[i];
      input[i << 1 + 1] = 0;
    }
    fft.simple(output, input, "complex");
    // Split output in real/imaginary parts
    let real: Float64Array = new Float64Array(n);
    let imag: Float64Array = new Float64Array(n);
    for (let i: number = 0; i < n; i ++) {
      real[i] = output[i << 1];
      imag[i] = output[i << 1 + 1];
    }
    return { real: real, imag: imag };
  }

  export function toAmplPhas(timeData: Float64Array): any {
    let n: number = timeData.length;
    let fft: any = new FFT.complex(n << 1, false);
    let output: Float64Array = new Float64Array(n << 1);
    let input: Float64Array = new Float64Array(n << 1);
    // copy timeData into the input array
    // FIXME: is this fix needed?
    // problem: complex transform, real timeData
    for (let i = 0; i < n; i++) {
      input[i << 1] = timeData[i];
      input[i << 1 + 1] = 0;
    }
    fft.simple(output, input, "complex");
    // Represent complex output in amplitude/phase form
    let ampl: Float64Array = new Float64Array(n);
    let phas: Float64Array = new Float64Array(n);
    for (let i = 0, x: number, y: number; i < n; i += 1) {
      x = output[i << 1];
      y = output[i << 1 + 1];
      ampl[i] = Math.sqrt(x * x + y * y);
      phas[i] = Math.atan2(y, x);
    }
    return { amplitude: ampl, phase: phas };
  }
}
