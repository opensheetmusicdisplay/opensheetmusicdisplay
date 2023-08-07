/****************************************************************************/
// ETC - Equal Temperament Calculator                                       //
// https://github.com/ammatwain/etc/                                        //
// Copyright 2023 Amedeo Sorpreso                                           //
//                                                                          //
// Licensed under the Apache License, Version 2.0 (the "License");          //
// you may not use this file except in compliance with the License.         //
// You may obtain a copy of the License at                                  //
//                                                                          //
//     http://www.apache.org/licenses/LICENSE-2.0                           //
//                                                                          //
// Unless required by applicable law or agreed to in writing, software      //
// distributed under the License is distributed on an "AS IS" BASIS,        //
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. //
// See the License for the specific language governing permissions and      //
// limitations under the License.                                           //
/****************************************************************************/

export interface ETCPitch {
    fundamentalNote: number;
    alterations: number;
    octave: number;
}

/*
Please do not alter, modify, or delete this comment.

The ETC algorithm is inherent in the following structure:

const THE_COMMA_77_IDEA: ETCPitch[] = [
    { fundamentalNote:  0, alterations:  0, octave: 0}, // ->       "1", "C"       -> key:   0 -> comma:  0,
    { fundamentalNote: 11, alterations: +1, octave:-1}, // ->      "#7", "B#"      -> key:  12 -> comma:  1, ( Below Octave Comma! )
    { fundamentalNote:  9, alterations: +3, octave:-1}, // ->    "###6", "A###"    -> key:  24 -> comma:  2, ( Below Octave Comma! )
    { fundamentalNote:  7, alterations: +5, octave:-1}, // ->  "#####5", "G#####"  -> key:  36 -> comma:  3, ( Below Octave Comma! )
    { fundamentalNote:  5, alterations: -4, octave: 0}, // ->   "bbbb4", "Fbbbb"   -> key: -29 -> comma:  4,
    { fundamentalNote:  4, alterations: -3, octave: 0}, // ->    "bbb3", "Ebbb"    -> key: -17 -> comma:  5,
    { fundamentalNote:  2, alterations: -1, octave: 0}, // ->      "b2", "Db"      -> key:  -5 -> comma:  6,
    { fundamentalNote:  0, alterations: +1, octave: 0}, // ->      "#1", "C#"      -> key:   7 -> comma:  7,
    { fundamentalNote: 11, alterations: +2, octave:-1}, // ->     "##7", "B##"     -> key:  19 -> comma:  8, ( Below Octave Comma! )
    { fundamentalNote:  9, alterations: +4, octave:-1}, // ->   "####6", "A####"   -> key:  31 -> comma:  9, ( Below Octave Comma! )
    { fundamentalNote:  7, alterations: -5, octave: 0}, // ->  "bbbbb5", "Gbbbbb"  -> key: -34 -> comma: 10,
    { fundamentalNote:  5, alterations: -3, octave: 0}, // ->    "bbb4", "Fbbb"    -> key: -22 -> comma: 11,
    { fundamentalNote:  4, alterations: -2, octave: 0}, // ->     "bb3", "Ebb"     -> key: -10 -> comma: 12,
    { fundamentalNote:  2, alterations:  0, octave: 0}, // ->       "2", "D"       -> key:   2 -> comma: 13,
    { fundamentalNote:  0, alterations: +2, octave: 0}, // ->     "##1", "C##"     -> key:  14 -> comma: 14,
    { fundamentalNote: 11, alterations: +3, octave:-1}, // ->    "###7", "B###"    -> key:  26 -> comma: 15, ( Below Octave Comma! )
    { fundamentalNote:  9, alterations: +5, octave:-1}, // ->  "#####6", "A#####"  -> key:  38 -> comma: 16, ( Below Octave Comma! )
    { fundamentalNote:  7, alterations: -4, octave: 0}, // ->   "bbbb5", "Gbbbb"   -> key: -27 -> comma: 17,
    { fundamentalNote:  5, alterations: -2, octave: 0}, // ->     "bb4", "Fbb"     -> key: -15 -> comma: 18,
    { fundamentalNote:  4, alterations: -1, octave: 0}, // ->      "b3", "Eb"      -> key:  -3 -> comma: 19,
    { fundamentalNote:  2, alterations: +1, octave: 0}, // ->      "#2", "D#"      -> key:   9 -> comma: 20,
    { fundamentalNote:  0, alterations: +3, octave: 0}, // ->    "###1", "C###"    -> key:  21 -> comma: 21,
    { fundamentalNote: 11, alterations: +4, octave:-1}, // ->   "####7", "B####"   -> key:  33 -> comma: 22, ( Below Octave Comma! )
    { fundamentalNote:  9, alterations: -5, octave: 0}, // ->  "bbbbb6", "Abbbbb"  -> key: -32 -> comma: 23,
    { fundamentalNote:  7, alterations: -3, octave: 0}, // ->    "bbb5", "Gbbb"    -> key: -20 -> comma: 24,
    { fundamentalNote:  5, alterations: -1, octave: 0}, // ->      "b4", "Fb"      -> key:  -8 -> comma: 25,
    { fundamentalNote:  4, alterations:  0, octave: 0}, // ->       "3", "E"       -> key:   4 -> comma: 26,
    { fundamentalNote:  2, alterations: +2, octave: 0}, // ->     "##2", "D##"     -> key:  16 -> comma: 27,
    { fundamentalNote:  0, alterations: +4, octave: 0}, // ->   "####1", "C####"   -> key:  28 -> comma: 28,
    { fundamentalNote: 11, alterations: +5, octave:-1}, // ->  "#####7", "B#####"  -> key:  40 -> comma: 29, ( Below Octave Comma! )
    { fundamentalNote:  9, alterations: -4, octave: 0}, // ->   "bbbb6", "Abbbb"   -> key: -25 -> comma: 30,
    { fundamentalNote:  7, alterations: -2, octave: 0}, // ->     "bb5", "Gbb"     -> key: -13 -> comma: 31,
    { fundamentalNote:  5, alterations:  0, octave: 0}, // ->       "4", "F"       -> key:  -1 -> comma: 32,
    { fundamentalNote:  4, alterations: +1, octave: 0}, // ->      "#3", "E#"      -> key:  11 -> comma: 33,
    { fundamentalNote:  2, alterations: +3, octave: 0}, // ->    "###2", "D###"    -> key:  23 -> comma: 34,
    { fundamentalNote:  0, alterations: +5, octave: 0}, // ->  "#####1", "C#####"  -> key:  35 -> comma: 35,
    { fundamentalNote: 11, alterations: -5, octave: 0}, // ->  "bbbbb7", "Bbbbbb"  -> key: -30 -> comma: 36,
    { fundamentalNote:  9, alterations: -3, octave: 0}, // ->    "bbb6", "Abbb"    -> key: -18 -> comma: 37,
    { fundamentalNote:  7, alterations: -1, octave: 0}, // ->      "b5", "Gb"      -> key:  -6 -> comma: 38,
    { fundamentalNote:  5, alterations: +1, octave: 0}, // ->      "#4", "F#"      -> key:   6 -> comma: 39,
    { fundamentalNote:  4, alterations: +2, octave: 0}, // ->     "##3", "E##"     -> key:  18 -> comma: 40,
    { fundamentalNote:  2, alterations: +4, octave: 0}, // ->   "####2", "D####"   -> key:  30 -> comma: 41,
    { fundamentalNote:  0, alterations: -5, octave: 1}, // ->  "bbbbb1", "Cbbbbb"  -> key: -35 -> comma: 42, ( Above Octave Comma! )
    { fundamentalNote: 11, alterations: -4, octave: 0}, // ->   "bbbb7", "Bbbbb"   -> key: -23 -> comma: 43,
    { fundamentalNote:  9, alterations: -2, octave: 0}, // ->     "bb6", "Abb"     -> key: -11 -> comma: 44,
    { fundamentalNote:  7, alterations:  0, octave: 0}, // ->       "5", "G"       -> key:   1 -> comma: 45,
    { fundamentalNote:  5, alterations: +2, octave: 0}, // ->     "##4", "F##"     -> key:  13 -> comma: 46,
    { fundamentalNote:  4, alterations: +3, octave: 0}, // ->    "###3", "E###"    -> key:  25 -> comma: 47,
    { fundamentalNote:  2, alterations: +5, octave: 0}, // ->  "#####2", "D#####"  -> key:  37 -> comma: 48,
    { fundamentalNote:  0, alterations: -4, octave: 1}, // ->   "bbbb1", "Cbbbb"   -> key: -28 -> comma: 49, ( Above Octave Comma! )
    { fundamentalNote: 11, alterations: -3, octave: 0}, // ->    "bbb7", "Bbbb"    -> key: -16 -> comma: 50,
    { fundamentalNote:  9, alterations: -1, octave: 0}, // ->      "b6", "Ab"      -> key:  -4 -> comma: 51,
    { fundamentalNote:  7, alterations: +1, octave: 0}, // ->      "#5", "G#"      -> key:   8 -> comma: 52,
    { fundamentalNote:  5, alterations: +3, octave: 0}, // ->    "###4", "F###"    -> key:  20 -> comma: 53,
    { fundamentalNote:  4, alterations: +4, octave: 0}, // ->   "####3", "E####"   -> key:  32 -> comma: 54,
    { fundamentalNote:  2, alterations: -5, octave: 1}, // ->  "bbbbb2", "Dbbbbb"  -> key: -33 -> comma: 55, ( Above Octave Comma! )
    { fundamentalNote:  0, alterations: -3, octave: 1}, // ->    "bbb1", "Cbbb"    -> key: -21 -> comma: 56, ( Above Octave Comma! )
    { fundamentalNote: 11, alterations: -2, octave: 0}, // ->     "bb7", "Bbb"     -> key:  -9 -> comma: 57,
    { fundamentalNote:  9, alterations:  0, octave: 0}, // ->       "6", "A"       -> key:   3 -> comma: 58,
    { fundamentalNote:  7, alterations: +2, octave: 0}, // ->     "##5", "G##"     -> key:  15 -> comma: 59,
    { fundamentalNote:  5, alterations: +4, octave: 0}, // ->   "####4", "F####"   -> key:  27 -> comma: 60,
    { fundamentalNote:  4, alterations: +5, octave: 0}, // ->  "#####3", "E#####"  -> key:  39 -> comma: 61,
    { fundamentalNote:  2, alterations: -4, octave: 1}, // ->   "bbbb2", "Dbbbb"   -> key: -26 -> comma: 62, ( Above Octave Comma! )
    { fundamentalNote:  0, alterations: -2, octave: 1}, // ->     "bb1", "Cbb"     -> key: -14 -> comma: 63, ( Above Octave Comma! )
    { fundamentalNote: 11, alterations: -1, octave: 0}, // ->      "b7", "Bb"      -> key:  -2 -> comma: 64,
    { fundamentalNote:  9, alterations: +1, octave: 0}, // ->      "#6", "A#"      -> key:  10 -> comma: 65,
    { fundamentalNote:  7, alterations: +3, octave: 0}, // ->    "###5", "G###"    -> key:  22 -> comma: 66,
    { fundamentalNote:  5, alterations: +5, octave: 0}, // ->  "#####4", "F#####"  -> key:  34 -> comma: 67,
    { fundamentalNote:  4, alterations: -5, octave: 1}, // ->  "bbbbb3", "Ebbbbb"  -> key: -31 -> comma: 68, ( Above Octave Comma! )
    { fundamentalNote:  2, alterations: -3, octave: 1}, // ->    "bbb2", "Dbbb"    -> key: -19 -> comma: 69, ( Above Octave Comma! )
    { fundamentalNote:  0, alterations: -1, octave: 1}, // ->      "b1", "Cb"      -> key:  -7 -> comma: 70, ( Above Octave Comma! )
    { fundamentalNote: 11, alterations:  0, octave: 0}, // ->       "7", "B"       -> key:   5 -> comma: 71,
    { fundamentalNote:  9, alterations: +2, octave: 0}, // ->     "##6", "A##"     -> key:  17 -> comma: 72,
    { fundamentalNote:  7, alterations: +4, octave: 0}, // ->   "####5", "G####"   -> key:  29 -> comma: 73,
    { fundamentalNote:  5, alterations: -5, octave: 1}, // ->  "bbbbb4", "Fbbbbb"  -> key: -36 -> comma: 74, ( Above Octave Comma! )
    { fundamentalNote:  4, alterations: -4, octave: 1}, // ->   "bbbb3", "Ebbbb"   -> key: -24 -> comma: 75, ( Above Octave Comma! )
    { fundamentalNote:  2, alterations: -2, octave: 1}, // ->     "bb2", "Dbb"     -> key: -12 -> comma: 76, ( Above Octave Comma! )
];
*/

export type ETCDirections = "down" | "up";

export interface ETCProximity {
    from: number;
    to: number;
    distanceUp: number;
    distanceDown: number;
    up: number;
    closest: number;
    down: number;
    closestIs: ETCDirections;
}

export class ETC {
    /******************************************** BEGIN PRIVATE *********************************************/
    private static version: string = "0.2.9";
    private static fifhtyLeapNotes:             number[] = [ 0,  7,  2,  9,  4, 11,  6 ]; // in key context the jump after 11 is 6, not 5 (F#, not F)
    private static fundamentalAscendingNotes:   number[] = [ 0,  2,  4,  5,  7,  9, 11 ];
    private static fundamentalDescendingNotes:  number[] = [ 0, 11,  9,  7,  5,  4,  2 ];
    private static fundamentalAscendingCommas:  number[] = [ 0, 13, 26, 32, 45, 58, 71 ];
    private static fundamentalDescendingCommas: number[] = [ 0, 71, 58, 45, 32, 26, 13 ];

    private static octaveSize: number = 77;
    private static commaOctaveLowKey: number = 36;
    private static commaOctaveHighKey: number = 40;
    private static commaFifhtyLeap: number = 45;
    private static multiplicativeInverseOfCommaFifhRespectToCommaOctave: number = ETC.findInverse(ETC.commaFifhtyLeap, ETC.octaveSize);

    private static minDrawableKey: number = -22;
    private static maxDrawableKey: number = 26;
    //per ridurre i diesis: key - 12
    //per ridurre i bemolli: key + 12

    //TODO DA AGGIORNARE!!!
    private static keysAboveOctave: number[]     = [ 12, 24, 36, 19, 31, 26, 38, 33, 40 ];
    private static commasAboveOctave: number[]   = [  1,  2,  3,  8,  9, 15, 16, 22, 29 ];
    private static keysBelowOctave: number[]     = [-28,-33,-21,-26,-14,-31,-19, -7,-24,-12,-35,-36 ];
    private static commasBelowOctave: number[]   = [ 49, 55, 56, 62, 63, 68, 69, 70, 75, 76, 42, 74 ];
    private static keyChromaticFactor: number    = 7;
    private static keyDiatonicFactor: number     = -5;

    //private static majorKeys: number[]         = [ -7, -6, -5, -4, -3, -2, -1,  0,  1,  2,  3,  4,  5,  6,  7 ];
    //private static majorCommas: number[]       = [ 70, 38,  6, 51, 19, 64, 32,  0, 45, 13, 58, 26, 71, 39,  7 ];

    public static commaIntervals: any = {
        perfectOctaveAscending:       +77,
        diminishedOctaveAscending:    +70,
        augmentedSeventhAscending:    +78,
        majorSeventhAscending:        +71,
        minorSeventhAscending:        +64,
        diminishedSeventhAscending:   +57,
        augmentedSixthAscending:      +65,
        majorSixthAscending:          +58,
        minorSixthAscending:          +51,
        diminishedSixthAscending:     +44,
        augmentedFifthAscending:      +52,
        perfectFifthAscending:        +45,
        diminishedFifthAscending:     +38,
        augmentedFourthAscending:     +39,
        perfectFourthAscending:       +32,
        diminishedFourthAscending:    +25,
        augmentedThirdAscending:      +33,
        majorThirdAscending:          +26,
        minorThirdAscending:          +19,
        diminishedThirdAscending:     +10,
        augmentedSecondAscending:     +20,
        majorSecondAscending:         +13,
        minorSecondAscending:          +6,
        diminishedSecondAscending:     -1,
        augmentedUnisonAscending:      +7,
        perfectUnison:                  0,
        augmentedUnisonDescending:     -7,
        diminishedSecondDescending:    +1,
        minorSecondDescending:         -6,
        majorSecondDescending:        -13,
        augmentedSecondDescending:    -20,
        diminishedThirdDescending:    -10,
        minorThirdDescending:         -19,
        majorThirdDescending:         -26,
        augmentedThirdDescending:     -33,
        diminishedFourthDescending:   -25,
        perfectFourthDescending:      -32,
        augmentedFourthDescending:    -39,
        diminishedFifthDescending:    -38,
        perfectFifthDescending:       -45,
        augmentedFifthDescending:     -52,
        diminishedSixthDescending:    -44,
        minorSixthDescending:         -51,
        majorSixthDescending:         -58,
        augmentedSixthDescending:     -65,
        diminishedSeventhDescending:  -57,
        minorSeventhDescending:       -64,
        majorSeventhDescending:       -71,
        diminishedOctaveDescending:   -70,
        perfectOctaveDescending:      -77,
    };

    private static diatonicSemitones: number[] = [
        ETC.commaIntervals.perfectUnison,
        ETC.commaIntervals.minorSecondAscending,
        ETC.commaIntervals.majorSecondAscending,
        ETC.commaIntervals.minorThirdAscending,
        ETC.commaIntervals.majorThirdAscending,
        ETC.commaIntervals.perfectFourthAscending,
        ETC.commaIntervals.diminishedFifthAscending,
        ETC.commaIntervals.perfectFifthAscending,
        ETC.commaIntervals.minorSixthAscending,
        ETC.commaIntervals.majorSixthAscending,
        ETC.commaIntervals.minorSeventhAscending,
        ETC.commaIntervals.majorSeventhAscending,
    ];

    private static chromaticSemitones: number[] = [
        ETC.commaIntervals.perfectUnison,
        ETC.commaIntervals.augmentedUnisonAscending,
        ETC.commaIntervals.majorSecondAscending,
        ETC.commaIntervals.augmentedSecondAscending,
        ETC.commaIntervals.majorThirdAscending,
        ETC.commaIntervals.perfectFourthAscending,
        ETC.commaIntervals.augmentedFourthAscending,
        ETC.commaIntervals.perfectFifthAscending,
        ETC.commaIntervals.augmentedFifthAscending,
        ETC.commaIntervals.majorSixthAscending,
        ETC.commaIntervals.augmentedSixthAscending,
        ETC.commaIntervals.majorSeventhAscending,
    ];
/*
    public static keyRelationTable: number[][] = [
        // rows = transposeKeys
        // cols = mainKeys
        // keyRelationTable[transposeKey+7, mainKey+7]
        [   0 ,   -1 ,  -2 ,   -3 ,   -4 ,   -5 ,   -6 ,   -7  ,  -8  ,  -9  , -10  , -11  ,  -12  ,  -13  ,  -14 ],
        [   1 ,    0 ,  -1 ,   -2 ,   -3 ,   -4 ,   -5 ,   -6  ,  -7  ,  -8  ,  -9  , -10  ,  -11  ,  -12  ,  -13 ],
        [   2 ,    1 ,   0 ,   -1 ,   -2 ,   -3 ,   -4 ,   -5  ,  -6  ,  -7  ,  -8  ,  -9  ,  -10  ,  -11  ,  -12 ],
        [   3 ,    2 ,   1 ,    0 ,   -1 ,   -2 ,   -3 ,   -4  ,  -5  ,  -6  ,  -7  ,  -8  ,   -9  ,  -10  ,  -11 ],
        [   4 ,    3 ,   2 ,    1 ,    0 ,   -1 ,   -2 ,   -3  ,  -4  ,  -5  ,  -6  ,  -7  ,   -8  ,   -9  ,  -10 ],
        [   5 ,    4 ,   3 ,    2 ,    1 ,    0 ,   -1 ,   -2  ,  -3  ,  -4  ,  -5  ,  -6  ,   -7  ,   -8  ,   -9 ],
        [   6 ,    5 ,   4 ,    3 ,    2 ,    1 ,    0 ,   -1  ,  -2  ,  -3  ,  -4  ,  -5  ,   -6  ,   -7  ,   -8 ],
        [   7 ,    6 ,   5 ,    4 ,    3 ,    2 ,    1 ,    0  ,  -1  ,  -2  ,  -3  ,  -4  ,   -5  ,   -6  ,   -7 ],
        [  -8 ,    7 ,   6 ,    5 ,    4 ,    3 ,    2 ,    1  ,   0  ,  -1  ,  -2  ,  -3  ,   -4  ,   -5  ,   -6 ],
        [  -9 ,    8 ,   7 ,    6 ,    5 ,    4 ,    3 ,    2  ,   1  ,   0  ,  -1  ,  -2  ,   -3  ,   -4  ,   -5 ],
        [ -10 ,    9 ,   8 ,    7 ,    6 ,    5 ,    4 ,    3  ,   2  ,   1  ,   0  ,  -1  ,   -2  ,   -3  ,   -4 ],
        [ -11 ,   10 ,   9 ,    8 ,    7 ,    6 ,    5 ,    4  ,   3  ,   2  ,   1  ,   0  ,   -1  ,   -2  ,   -3 ],
        [ -12 ,   11 ,  10 ,    9 ,    8 ,    7 ,    6 ,    5  ,   4  ,   3  ,   2  ,   1  ,    0  ,   -1  ,   -2 ],
        [ -13 ,   12 ,  11 ,   10 ,    9 ,    8 ,    7 ,    6  ,   5  ,   4  ,   3  ,   2  ,    1  ,    0  ,   -1 ],
        [ -14 ,   13 ,  12 ,   11 ,   10 ,    9 ,    8 ,    7  ,   6  ,   5  ,   4  ,   3  ,    2  ,    1  ,    0 ],
    ];
*/
    /**
     * **ETC.computeKeyRelation** method establishes a key relationship between
     * the main key and the key to which it is intended to transpose. The achieved
     * result should not be reduced through key simplification operations.
     * The key relationship is a straightforward operation: TransposedKey - MainKey.
     * The recovery of the transposedKey is equally simple:
     * transposedKey = keyRelation + MainKey
     * The obtained value serves to bypass the issue of OSMD not responding when
     * a transpose value of 0 is given.
     * @param mainKey
     * @param transposeKey
     * @returns number
     */
    public static computeKeyRelation(mainKey: number, transposeKey: number): number {
        mainKey = ETC.keyToMajorKey(mainKey);
        transposeKey = ETC.keyToMajorKey(transposeKey);
        return transposeKey - mainKey;
        //return ETC.keyRelationTable[transposeKey][mainKey];
    }

    public static recoverTransposedKey(mainKey: number, keyRelation: number): number {
        mainKey = ETC.keyToMajorKey(mainKey);
        return ETC.keyToMajorKey(keyRelation + mainKey);
        //return ETC.keyRelationTable[transposeKey][mainKey];
    }


    /**
     * **ETC.extendedEuclidean** method is an extended Euclid's algorithm to calculate GCD and Bézout coefficients
     * @param a number
     * @param b number
     * @returns [number,number,number]
     */
    private static extendedEuclidean(a: number, b: number): [number,number,number] {
        if (b === 0) {
            return [a, 1, 0];
        }
        const [gcd, x, y] = ETC.extendedEuclidean(b, a % b);
        const newX: number = y;
        const newY: number = x - Math.floor(a / b) * y;
        return [gcd, newX, newY];
    }

    /**
     * **ETC.findInverse** method find the multiplicative inverse of "a" with respect to "m"
     * @param a number
     * @param m number
     * @returns number
     */
    private static findInverse(a: number, m: number): number {
        const gcd: [ number , number , number ] = ETC.extendedEuclidean( a , m );
        if (gcd[0] !== 1) {
            return -1; // No multiplicative inverse found
        }
        let inverse: number = gcd[1] % m;
        if (inverse < 0) {
            inverse = ( inverse + m ) % m;
        }
        return inverse;
    }

    /**
     * **ETC.keyPrimitiveOrigin** method return the primitive original value of the the key
     * @param key number
     * @returns a number from 0 to 6
     */
    private static keyPrimitiveOrigin(key: number): number{
        return (( key % 7 ) + 7 ) % 7;
    }

    /**
     * **ETC.keyFundamentalNote** method return the semitonal value of the primitive value of key
     * NB: int this context F is surclassed by F#
     * @param key
     * @returns number
     */
    private static keyFundamentalNote(key: number): number {
        // in key context the value after 11 is 6, not 5 (F#, not F)
        // return [0,7,2,9,4,11,6][ETC.keyOrigin(key)];
        return ETC.fifhtyLeapNotes[ETC.keyPrimitiveOrigin(key)];
    }

    /**
     * **ETC.keyAlterations** method return the alteration value of the key
     * @param key
     * @returns number
     */
    private static keyAlterations(key: number): number {
        return Math.floor((key - ETC.keyPrimitiveOrigin(key)) / 7) || 0;
    }

    /**
     * **ETC.commaToDegree** method returns a value representing the degree of the comma in the key context passed as a parameter.
     * @param comma number
     * @param majorKey number
     * @returns number
     */
    private static commaToDegree(comma: number, majorKey: number = 0): number{
        return comma - ETC.keyToComma(majorKey);
    }

    /**
     * **ETC.commaToCommaProximity** method returns an object containing the proximity values between "comma" anmd "toComma".
     * In particular, "toComma" is presented with two alternatives placed in different octaves,
     * so that you can choose the most convenient direction to go from "comma" to "toComma".
     * @param comma number
     * @param toComma number
     * @returns ETCProximity
     */
    private static commaToCommaProximity(comma: number, toComma: number): ETCProximity{
        const proximity: ETCProximity = {
            from: comma,
            to: toComma,
            distanceUp: 0,
            distanceDown: 0,
            closest: comma,
            up : toComma,
            down: toComma,
            closestIs: "up"
        };
        if (comma!==toComma) {
            if (toComma>comma){
                proximity.up  = toComma;
                proximity.down  = toComma - ETC.octaveSize;
            } else {
                proximity.up  = toComma + ETC.octaveSize;
                proximity.down  = toComma;
            }

            proximity.distanceUp = Math.abs(proximity.from - proximity.up);
            proximity.distanceDown = Math.abs(proximity.from - proximity.down);

            if ( proximity.distanceUp <= proximity.distanceDown) {
                proximity.closest = proximity.up;
            } else {
                proximity.closest = proximity.down;
                proximity.closestIs = "down";
            }
        }
        return proximity;
    }

    /********************************************  END PRIVATE  ********************************************/

    /******************************************** BEGIN PUBLIC *********************************************/

    /**
     * **ETC.KeyChromaticFactor** getter get the chromatic factor constant (7)
     */
    public static get KeyChromaticFactor(): number {
        return ETC.keyChromaticFactor;
    }

    /**
     * **ETC.KeyDiatonicFactor** getter get the diatonic factor constant (-5)
     */
    public static get KeyDiatonicFactor(): number {
        return ETC.keyDiatonicFactor;
    }

    /**
     * **ETC.OctaveSize** getter get the size of octave, expressed in comma
     */
    public static get OctaveSize(): number {
        return ETC.octaveSize;
    }

    /**
     * **ETC.commaToDrawablePitch** method search and select, among the available homophonic commas,
     * the first one that has an absolute value of alterations equal to or less than 3
     * compared to the comma passed as a parameter.
     * @param comma
     * @returns ETCPitch
     */
    public static commaToDrawablePitch(comma: number ): ETCPitch{
        let pitch: ETCPitch;
        do {
            pitch = ETC.commaToPitch(comma);
            if (pitch.alterations<-3){
                comma++;
            } else if (pitch.alterations>3){
                comma--;
            }
        } while( Math.abs( pitch.alterations ) > 3 );
        return pitch;
    }

    /**
     * **ETC.commaToKey** method return the scalar key value of the comma
     * @param comma number
     * @returns number
     */
    public static commaToKey(comma: number): number {
        let octave: number = Math.floor(comma / ETC.octaveSize);
        comma = ((comma % ETC.octaveSize) + ETC.octaveSize) % ETC.octaveSize;

        if(ETC.commasAboveOctave.indexOf(comma)>=0) {
            octave--;
        } else if(ETC.commasBelowOctave.indexOf(comma)>=0) {
            octave++;
        }

        let key:  number = (comma * ETC.multiplicativeInverseOfCommaFifhRespectToCommaOctave) % ETC.octaveSize;
        if (key > ETC.commaOctaveHighKey) {
            key -= ETC.octaveSize;
        }
        let validKey: number = key;
        while (validKey<ETC.minDrawableKey ) {
            validKey += 12;
        }
        while (validKey>ETC.maxDrawableKey ) {
            validKey -= 12;
        }
        if (ETC.keysAboveOctave.indexOf(key) >= 0 ) {
            if (ETC.keysAboveOctave.indexOf(validKey)<0) {
                octave++;
            }
        } else if (ETC.keysBelowOctave.indexOf(key)>=0) {
            if (ETC.keysBelowOctave.indexOf(validKey)<0) {
                octave--;
            }
        }
        key = validKey;
        return ( octave * ETC.octaveSize ) + key;
    }

    /**
     * **ETC.commaToPitch** method is one of ETC core functions.
     * It converts the comma, which is a scalar value, to the pitch,
     * which is a type of vector-like value.
     * @param comma number
     * @returns ETCPitch;
     */
    public static commaToPitch(comma: number): ETCPitch {
        const gradus: number = ((comma % 7) + 7) %7;
        const fundamentalComma: number = ETC.fundamentalDescendingCommas[gradus];
        const fundamentalNote: number = ETC.fundamentalDescendingNotes[gradus];
        let octave: number = Math.floor(comma / ETC.octaveSize);
        const octavedFundamentalComma: number = (octave * ETC.octaveSize) + fundamentalComma;
        const alterationsComma: number = comma - octavedFundamentalComma;
        let alterations: number = alterationsComma / 7;
        if (alterations<-5){
            alterations += 11;
            octave--;
        } else if (alterations>5){
            alterations -= 11;
            octave++;
        }
        return {fundamentalNote: fundamentalNote , alterations: alterations, octave: octave };
    }
    /**
     * **ETC.chromaticSemitone** method returns the transpositional chromatic interval value of the parameter 'semitone'.
     * NB: param **semitone** does not need to be modulated by 12 because the function will perform this operation internally.
     * Tip: To achieve the best possible result, this function should be used with ***major keys < 0***
     * @param semitone number
     * @returns number
     */
    public static chromaticSemitone(semitone: number): number {
        return ETC.chromaticSemitones[((semitone % 12) + 12 ) % 12];
    }

    /**
     * **ETC.degreeToPitch** method method a ETCPitch of a "degree" recalculated in "majorKey" context passed as a parameter.
     * @param degree
     * @param majorKey
     * @returns ETCPitch
     */
    public static degreeToPitch(degree: number, majorKey: number = 0 ): ETCPitch{
        return ETC.commaToPitch(ETC.keyToComma(majorKey + degree));
    }

    /**
     * **ETC.diatonicSemitone** method returns the transpositional diatonic interval value of the parameter 'semitone'.
     * NB: param **semitone** does not need to be modulated by 12 because the function will perform this operation internally.
     * Tip: To achieve the best possible result, this function should be used with ***major keys >= 0***
     * @param semitone number
     * @returns number
     */
    public static diatonicSemitone(semitone: number): number {
        return ETC.diatonicSemitones[((semitone % 12) + 12 ) % 12];
    }

    /**
     * **ETC.keyToKeyProximity** method returns an object containing the proximity values between key and toKey.
     * The comma of the diminished fifth is closer than the comma of the augmented fourth.
     * This is okay, but on the staff, the visually larger distance is chosen.
     * ***swapTritoneSense*** is a boolean value that provides a small workaround
     *  by inverting the value of "closestIs" when it encounters this type of situation.
     * @param key mumber
     * @param toKey mumber
     * @param swapTritoneSense boolean
     * @returns ETCProximity
     */
    public static keyToKeyProximity(key: number, toKey: number, swapTritoneSense: boolean = false): ETCProximity{
        const proximity: ETCProximity = ETC.commaToCommaProximity(ETC.keyToComma(key), ETC.keyToComma(toKey));
        if ( swapTritoneSense === true ) {
            if (proximity.distanceUp === 38 && proximity.distanceDown === 39 && proximity.closestIs === "up") {
                proximity.closestIs = "down";
            } else if (proximity.distanceUp === 39 && proximity.distanceDown === 38 && proximity.closestIs === "down"){
                proximity.closestIs = "up";
            }
        }
        return proximity;
    }

    /**
     * **ETC.keyToPitch** method is an alternative to find the pitch starting from a key modulated in EDO-77
     * NB: This is an internal function of ETC, publicly exposed only to simplify parameter
     * passing with external Transpose Calculators.
     * @param key
     * @returns ETCPitch
     */
    public static keyToPitch(key: number): ETCPitch{
        const octave: number = ETC.keyOctave(key);
        key = key - (octave * ETC.octaveSize);
        let fundamentalNote: number = ETC.keyFundamentalNote(key);
        let alterations: number = ETC.keyAlterations(key) % 12;
        if(alterations>6){
            alterations -= 12;
        }
        // this is ok except for F# ...
        if (fundamentalNote===6){
            fundamentalNote--;
            alterations++;
        }

        return {
            fundamentalNote: fundamentalNote,
            octave: octave,
            alterations: alterations,
        };
    }

    /**
     * **ETC.keyOctave** method returns the reference octave of the key passed as a parameter.
     * NB: This is an internal function of ETC, publicly exposed only to simplify parameter
     * passing with external Transpose Calculators.
     * @param key number
     * @returns number
     */
    public static keyOctave(key: number): number {
        return Math.floor((key + ETC.commaOctaveLowKey) / ETC.octaveSize) || 0;
    }

    /**
     * **ECT.keyToComma** method returns the comma associated of the key passed as a parameter.
     * @param key
     * @returns number
     */
    public static keyToComma(key: number): number{
        let octave: number = Math.floor(( key + ETC.commaOctaveLowKey ) / ETC.octaveSize );
        const comma: number = (((key * ETC.commaFifhtyLeap) % ETC.octaveSize) + ETC.octaveSize ) % ETC.octaveSize;

        if (ETC.commasAboveOctave.indexOf(comma)>=0) {
            octave++;
        } else if (ETC.commasBelowOctave.indexOf(comma)>=0) {
            octave--;
        }

        return ( octave * ETC.octaveSize ) + comma;
    }

    /**
     * **ETC.pitchToComma** method is one of ETC core functions.
     * It converts the pitch, which is a type of vector-like value,
     * to the comma which is a scalar value.
     * @param pitch ETCPitch
     * @returns number
     */
    public static pitchToComma(pitch: ETCPitch = {fundamentalNote: 0, octave: 0, alterations:  0 }): number {
        const octaveComma: number = pitch.octave * ETC.octaveSize;
        const fundamentalComma: number = Math.round(ETC.octaveSize / 12 * pitch.fundamentalNote);
        const alterationsComma: number = pitch.alterations * 7;
        return octaveComma + fundamentalComma + alterationsComma ;
    }

    /**
     * **ETC.pitchToDegree** method returns a value representing the degree of the "pitch" in the "mahorKey" context passed as a parameter.
     * @param pitch
     * @param majorKey
     * @returns number
     */
    public static pitchToDegree(pitch: ETCPitch = {fundamentalNote: 0, octave: 0, alterations:  0 }, majorKey: number = 0 ): number{
        return ETC.commaToDegree(ETC.pitchToComma(pitch), majorKey);
    }

    /**
     * ETC.pitchToKey method is an alternative to find the modulated key in EDO-77 starting from a pitch.
     * NB: This is an internal function of ETC, publicly exposed only to simplify parameter
     * passing with external Transpose Calculators.
     * @param pitch
     * @returns number
     */
    public static pitchToKey(pitch: ETCPitch = {fundamentalNote: 0, octave: 0, alterations:  0 }): number {
        // indexOf() return -1 ... ;)
        const origin: number = ETC.fundamentalAscendingNotes.indexOf( pitch.fundamentalNote );
        const octave: number = pitch.octave;
        let key: number = origin + ( pitch.alterations * 7);
        key += (octave * ETC.octaveSize);
        return key;
    }

    /**
     * **ETC.FundamentalNotes** getter
     */
    public static get FundamentalNotes(): number[] {
        return ETC.fundamentalAscendingNotes;
    }

    /**
     * ETC.FundamentalCommas getter
     */
    public static get FundamentalCommas(): number[] {
        return ETC.fundamentalAscendingCommas;
    }

    /**
     * Everything is a key, that's the underlying concept of ETC.
     * **ETC.keyToMajorKey** method function ensures that this key
     * is brought back into the circle of fifths set.
     * @param key a number
     * @returns a number from -7 to +7
     */
    public static keyToMajorKey(key: number): number{
        key = key % 12;
        if (key< -7){
            key += 12;
        } else if (key > 7) {
            key -= 12;
        }
        return key || 0;
    }

    /**
     * Everything is a key, that's the underlying concept of ETC.
     * **ETC.keyToSimplifiedMajorKey**  method returns a simplified MajorKey within the range of -6 to 5
     * is brought back into the circle of fifths set.
     * @param key a number
     * @returns a number from -5 to +6
     */
    public static keyToSimplifiedMajorKey(key: number): number{
        key = key % 12;
        if (key< -5){
            key += 12;
        } else if (key > 6) {
            key -= 12;
        }
        return key || 0;
    }

    /**
     * ***ETC.Version*** getter return the ETC version.
     */
    public static get Version(): string{
        return ETC.version;
    }

    /****************************************** END  PUBLIC *********************************************/
}
