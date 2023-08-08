## Extended Transpose Calculator with OpenSheetMusicDisplay
Welcome to the Extended Transpose Calculator based on OpenSheetMusicDisplay!
You can see it in action at the link:
[https://ammatwain.github.io/extended-transpose-calculator](https://ammatwain.github.io/extended-transpose-calculator)

### WARNING
The ExtendendTransposeCalculator project is in alpha and is undergoing continuous review.
Procedure names and strategies for interfacing with OSMD may change suddenly and without notice.
If you're interested in a stable product, I invite you to use the original version of OpenSheetMusicDisplay,
available at the link:
[https://github.com/opensheetmusicdisplay/opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay)

## Introduction

This project is a practical implementation of another
project of mine, ETC (Equal Temperament Calculator),
available at the link:
[https://github.com/ammatwain/ETC/](https://github.com/ammatwain/ETC/)

The transposition calculator is called ExtendedTransposeCalculator and uses ETC's routines to calculate transpositions.

## What ExtendedTransposeCalculator Offers to OpenSheetMusicDisplay

With ExtendedTransposeCalculator, you can:
1. Transpose to and from any key, with the optional addition of ascending or descending octaves.
2. Transpose by semitones, adjusting the key signature to the requested semitone.
3. Transpose by musical intervals.
4. Transpose diatonically.

ETC does not focus directly on transposition routines.

Its main goal is the transformation of a Pitch (which is a kind of vector) into a scalar value called Comma.
The Comma represents the difference between the chromatic semitone and the diatonic semitone.
In some theories, an octave is divided into 53 commas, which already cover the majority of calculations.
ETC uses an octave of 77 Commas for greater calculation precision. More precisely,
in the system I have envisioned, a Comma unit represents the seventy-seventh part of an octave.

## Calculation of Commas

An example: Once you obtain the Comma of a Pitch, the Comma of the current key, and the Comma of the transposition key,
transposition becomes a game of subtracting/adding Commas.
After performing these operations, ETC provides routines to convert the Comma back into a Pitch.

