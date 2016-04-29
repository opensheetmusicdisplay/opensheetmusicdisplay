import { FFT2 } from "../../src/Util/fft";

describe("Fast Fourier Transform tests:", () => {
    describe("test1?", () => {
      let array: number[] = [0.5, 0.5, 0.5];
      let res: { imag: Float64Array; real: Float64Array; } = FFT2.toRealImag(array);

        it("will succeed", (done: MochaDone) => {
            console.log(res.imag[0], res.real[0]);
            console.log(JSON.stringify(res));
            done();
        });
    });
});
