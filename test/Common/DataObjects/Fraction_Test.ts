import { expect } from "vitest";
/**
 * Created by Oliver on 16.03.2016.
 */
import { Fraction } from "../../../src/Common/DataObjects/Fraction";

describe("Fraction Unit Tests:", () => {
    describe("Construct Fraction, check properties", () => {
        const f1: Fraction = new Fraction(2, 6);

        it("Numerator and Denominator", () => {
            expect(f1.Numerator).to.equal(1);
            expect(f1.Denominator).to.equal(3);
        });

        it("Real value", () => {
            expect(f1.RealValue).to.equal(1 / 3);
        });
    });
    describe("Compare fractions", () => {
      let f1: Fraction;
      let f2: Fraction;
      const rand: () => number = function(): number {
        return Math.floor(Math.random() * 500) + 1;
      };
      it("lt attribute", () => {
        for (let i: number = 0; i < 10; i += 1) {
          f1 = new Fraction(rand(), rand());
          f2 = new Fraction(rand(), rand());
          expect(f1.lt(f2)).to.equal(f1.RealValue < f2.RealValue);
        }
      });
    });

    it("new Fraction() returns for Infinity, NaN, a zero denominator and non-integers far apart", async () => {
      // Infinity looped forever (e.g. from a <duration> with 309 or more digits), 1.5 / 4e9 took 9 s.
      // In a worker: the test's page can't stop a loop that doesn't end, the worker can be terminated.
      const fractionUrl: string = new URL("/src/Common/DataObjects/Fraction.ts", location.origin).href; // from Vitest's server
      const workerCode: string = `import { Fraction } from "${fractionUrl}";
        for (const [numerator, denominator] of [[Infinity, 4], [4, Infinity], [-Infinity, 4], [NaN, 4], [3, 0], [1.5, 4e9], [1.5, 4e20]]) {
          postMessage(\`new Fraction(\${numerator}, \${denominator})\`);
          new Fraction(numerator, denominator);
        }
        postMessage("returned");`;
      const worker: Worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" })), { type: "module" });
      try {
        const lastMessage: string = await new Promise<string>((resolve: (message: string) => void, reject: (error: Error) => void) => {
          let started: string = "the worker's import of Fraction";
          const timer: ReturnType<typeof setTimeout> = setTimeout(() => reject(new Error(`${started} didn't return within 5 s`)), 5000);
          worker.onmessage = (event: MessageEvent<string>): void => {
            started = event.data;
            if (event.data === "returned") {
              clearTimeout(timer);
              resolve(event.data);
            }
          };
          worker.onerror = (event: ErrorEvent): void => {
            clearTimeout(timer);
            reject(new Error(`${started}: ${event.message}`));
          };
        });
        expect(lastMessage).to.equal("returned");
      } finally {
        worker.terminate();
      }
    });
});
