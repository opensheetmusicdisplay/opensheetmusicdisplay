import { ETC } from "../src/Plugins/ExtendedTranspose";
import { OpenSheetMusicDisplay } from "../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ExtendedTransposeCalculator } from "../src/Plugins/ExtendedTranspose";

/*jslint browser:true */

//"use strict";
let openSheetMusicDisplay: OpenSheetMusicDisplay;
const zoom: number = 0.66;
let osmdVersion: HTMLSpanElement;
let error_tr: HTMLElement;
let error_td: HTMLElement;
let canvas: HTMLDivElement;
let selectSample: HTMLSelectElement;
let transposeByKey: HTMLSelectElement;
let transposeByKeyBtn: HTMLButtonElement;
let transposeByKeyOctave: HTMLInputElement;
let transposeByHalftones: HTMLInputElement;
let transposeByHalftonesBtn: HTMLButtonElement;
let transposeByInterval: HTMLSelectElement;
let transposeByIntervalBtn: HTMLButtonElement;
let transposeKeySignatures: HTMLInputElement;
let transposeDiatonically: HTMLSelectElement;
let transposeDiatonicallyBtn: HTMLButtonElement;
let removeKeySignatures: HTMLButtonElement;

const samples: string[][] = [
    ["Bach, J.S. - Preludio e Fuga 3 in Do diesis maggiore (BWV 848)","sheets/JohannSebastianBach_Preludio_e_Fuga_3_in_Do_diesis_maggiore_BWV848.musicxml"],
    ["Bach, J.S. - Preludio e Fuga 8 in Mi bemolle minore (BWV 853)","sheets/JohannSebastianBach_Preludio_e_Fuga_3_in_Mi_bemolle_minore_BWv853.musicxml"],
    ["Bach, J.S. - Praeludium in C-Dur BWV846 1","sheets/JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml"],
    ["Bach, J.S. - Air","sheets/JohannSebastianBach_Air.xml"],
    ["Beethoven, L.v. - An die ferne Geliebte","sheets/Beethoven_AnDieFerneGeliebte.xml"],
    ["Clementi, M. - Sonatina Op.36 No.1 Pt.1","sheets/MuzioClementi_SonatinaOpus36No1_Part1.xml"],
    ["Clementi, M. - Sonatina Op.36 No.1 Pt.2","sheets/MuzioClementi_SonatinaOpus36No1_Part2.xml"],
    ["Clementi, M. - Sonatina Op.36 No.3 Pt.1","sheets/MuzioClementi_SonatinaOpus36No3_Part1.xml"],
    ["Clementi, M. - Sonatina Op.36 No.3 Pt.2","sheets/MuzioClementi_SonatinaOpus36No3_Part2.xml"],
    ["Gounod, C. - Méditation","sheets/CharlesGounod_Meditation.xml"],
    ["Haydn, J. - Concertante Cello","sheets/JosephHaydn_ConcertanteCello.xml"],
    ["Joplin, S. - Elite Syncopations","sheets/ScottJoplin_EliteSyncopations.xml"],
    ["Joplin, S. - The Entertainer","sheets/ScottJoplin_The_Entertainer.xml"],
    ["Mozart, W.A. - An Chloe","sheets/Mozart_AnChloe.xml"],
    ["Mozart, W.A. - Das Veilchen","sheets/Mozart_DasVeilchen.xml"],
    ["Mozart, W.A. - Clarinet Quintet (Excerpt)","sheets/Mozart_Clarinet_Quintet_Excerpt.mxl"],
    ["Mozart, W.A. - String Quartet in G, K. 387, 1st Mvmt Excerpt","sheets/Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml"],
    ["Mozart/Holzer - Land der Berge (national anthem of Austria)","sheets/Land_der_Berge.musicxml"],
    ["Stress Test - F Clef & Key","sheets/Stress_Test_F_Clef_and_Key.musicxml"],
    ["Stress Test - Clef & Key","sheets/Stress_Test_Clef_and_Key.musicxml"],
    ["Stress Test - Homophonic Keys - G Clef","sheets/Stress_Test_With_Homophonic_Keys_G_Clef.musicxml"],
    ["Stress Test - Homophonic Keys - F Clef","sheets/Stress_Test_With_Homophonic_Keys_F_Clef.musicxml"],
    ["Stress Test - Homophonic Keys - C Clef","sheets/Stress_Test_With_Homophonic_Keys_C_Clef.musicxml"],
    ["Stress Test - Homophonic Keys - F/C/G Clefs","sheets/Stress_Test_With_Homophonic_Keys_F_C_G_Clef.musicxml"],
    ["Stress Test - Homophonic Keys - G/C/F Clefs","sheets/Stress_Test_With_Homophonic_Keys_G_C_F_Clef.musicxml"],
    ["Stress Test - Key Transpose","sheets/Stress_Test_Key_Transpose.musicxml"],
    ["Stress Test - Diminished Seventh Chords","sheets/Stress_Test_With_Diminished_Seventh_Chords.musicxml"],
    ["OSMD Function Test - All","sheets/OSMD_function_test_all.xml"],
    ["OSMD Function Test - Accidentals","sheets/OSMD_function_test_accidentals.musicxml"],
    ["OSMD Function Test - Autobeam","sheets/OSMD_function_test_autobeam.musicxml"],
    ["OSMD Function Test - Auto-/Custom-Coloring","sheets/OSMD_function_test_auto-custom-coloring-entchen.musicxml"],
    ["OSMD Function Test - Bar lines","sheets/OSMD_function_test_bar_lines.musicxml"],
    ["OSMD Function Test - Chord Symbols","sheets/OSMD_function_test_chord_symbols.musicxml"],
    ["OSMD Function Test - Chord Spacing","sheets/OSMD_function_test_chord_spacing.mxl"],
    ["OSMD Function Test - Chord Symbols - Various Chords","sheets/OSMD_function_test_chord_tests_various.musicxml"],
    ["OSMD Function Test - Chord Symbols - BrookeWestSample","sheets/BrookeWestSample.mxl"],
    ["OSMD Function Test - Color (from XML)","sheets/OSMD_function_test_color.musicxml"],
    ["OSMD Function Test - Container height (compacttight mode)","sheets/OSMD_Function_Test_Container_height.musicxml"],
    ["OSMD Function Test - Drumset","sheets/OSMD_function_test_drumset.musicxml"],
    ["OSMD Function Test - Drums on one Line","sheets/OSMD_Function_Test_Drums_one_line_snare_plus_piano.musicxml"],
    ["OSMD Function Test - Expressions","sheets/OSMD_function_test_expressions.musicxml"],
    ["OSMD Function Test - Expressions Overlap","sheets/OSMD_function_test_expressions_overlap.musicxml"],
    ["OSMD Function Test - Grace Notes","sheets/OSMD_function_test_GraceNotes.xml"],
    ["OSMD Function Test - Metronome Marks","sheets/OSMD_function_test_metronome_marks.mxl"],
    ["OSMD Function Test - Multiple Rest Measures","sheets/OSMD_function_test_multiple_rest_measures.musicxml"],
    ["OSMD Function Test - Invisible Notes","sheets/OSMD_function_test_invisible_notes.musicxml"],
    ["OSMD Function Test - Notehead Shapes","sheets/OSMD_function_test_noteheadShapes.musicxml"],
    ["OSMD Function Test - Ornaments","sheets/OSMD_function_test_Ornaments.xml"],
    ["OSMD Function Test - Pedals","sheets/OSMD_Function_Test_Pedals.musicxml"],
    ["OSMD Function Test - Selecting Measures To Draw","sheets/OSMD_function_test_measuresToDraw_Beethoven_AnDieFerneGeliebte.xml"],
    ["OSMD Function Test - System and Page Breaks","sheets/OSMD_Function_Test_System_and_Page_Breaks_4_pages.mxl"],
    ["OSMD Function Test - Tabulature","sheets/OSMD_Function_Test_Tabulature_hayden_study_1.mxl"],
    ["OSMD Function Test - Tabulature MultiBends","sheets/OSMD_Function_Test_Tablature_Multibends.musicxml"],
    ["OSMD Function Test - Tabulature All Effects","sheets/OSMD_Function_Test_Tablature_Alleffects.musicxml"],
    ["OSMD Function Test - Tremolo","sheets/OSMD_Function_Test_Tremolo_2bars.musicxml"],
    ["OSMD Function Test - Labels","sheets/OSMD_Function_Test_Labels.musicxml"],
    ["OSMD Function Test - High Slur Test","sheets/test_slurs_highNotes.musicxml"],
    ["OSMD Function Test - Auto Multirest Measures Single Staff","sheets/Test_Auto_Multirest_1.musicxml"],
    ["OSMD Function Test - Auto Multirest Measures Multiple Staves","sheets/Test_Auto_Multirest_2.musicxml"],
    ["OSMD Function Test - String number collisions","sheets/test_string_number_collisions.musicxml"],
    ["OSMD Function Test - Repeat Stave Connectors","sheets/OSMD_function_Test_Repeat.musicxml"],
    ["OSMD Function Test - Voice Alignment","sheets/OSMD_Function_Test_Voice_Alignment.musicxml"],
    ["Schubert, F. - An Die Musik","sheets/Schubert_An_die_Musik.xml"],
    ["Actor, L. - Prelude (Large Sample, loading time)","sheets/ActorPreludeSample.xml"],
    ["Actor, L. - Prelude (Large, No Print Part Names)","sheets/ActorPreludeSample_PartName.xml"],
    ["Anonymous - Saltarello","sheets/Saltarello.mxl"],
    ["Debussy, C. - Mandoline","sheets/Debussy_Mandoline.xml"],
    ["Levasseur, F. - Parlez Mois","sheets/Parlez-moi.mxl"],
    ["Schumann, R. - Dichterliebe","sheets/Dichterliebe01.xml"],
    ["Telemann, G.P. - Sonate-Nr.1.1-Dolce","sheets/TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml"],
    ["Telemann, G.P. - Sonate-Nr.1.2-Allegro","sheets/TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml"],
];

function selectSampleOnChange(str: string = ""): void {
    error();
    disable();
    if (selectSample) {
        str = selectSample.value;
    }
    // zoom = 1.0;

    openSheetMusicDisplay.load(str).then(
        function () {
            openSheetMusicDisplay.zoom = zoom;
            return openSheetMusicDisplay.render();
        },
        function (e) {
            //errorLoadingOrRenderingSheet(e, "rendering");
        }
    ).then(
        function () {
            if (1) {
                // "0" is bad for now, then 0 --> 12
                if (openSheetMusicDisplay.TransposeCalculator && openSheetMusicDisplay.TransposeCalculator.Options) {
                    transposeByKey.value = String(openSheetMusicDisplay.TransposeCalculator.Options.MainKey  || 0 );
                }
                enable();
            }
            return;
        }, function (e) {
            //errorLoadingOrRenderingSheet(e, "loading");
            //onLoadingEnd(isCustom);
            enable();
        }
    );
}


function error(errString: string = ""): void {
    if (!errString) {
        error_tr.style.display = "none";
    } else {
        console.log("[OSMD demo] error: " + errString);
        error_td.textContent = errString;
        error_tr.style.display = "";
        canvas.style.width = canvas.style.height = String(0);
        enable();
    }
}

// Enable/Disable Controls

function disable(): void {
    document.body.style.opacity = String(0.3);
    setDisabledForControls("disabled");
}

function enable(): void {
    document.body.style.opacity = String(1);
    setDisabledForControls("");
    //logCanvasSize();
}

function rerender(): void {
    disable();
    window.setTimeout(function () {
        if (openSheetMusicDisplay.IsReadyToRender()) {
            openSheetMusicDisplay.render();
        } else {
            console.log("[OSMD demo] Loses context!"); // TODO not sure that this message is reasonable, renders fine anyways. maybe vexflow context lost?
            selectSampleOnChange(); // reload sample e.g. after osmd.clear()
        }
        enable();
    }, 0);
}

function setDisabledForControls(disabledValue): void {
    if (selectSample) {
        selectSample.disabled = disabledValue;
    }
}

window.addEventListener("DOMContentLoaded",(e)=>{
    osmdVersion = <HTMLSpanElement>document.getElementById("osmd-version");
    error_tr = <HTMLDivElement>document.getElementById("error-tr");
    error_td = <HTMLDivElement>document.getElementById("error-td");
    canvas = <HTMLDivElement>document.querySelector("#sheet-container");
    selectSample = <HTMLSelectElement>document.querySelector("#select-sample");
    transposeByHalftones = <HTMLInputElement>document.getElementById("transpose-by-halftones");
    transposeByHalftonesBtn = <HTMLButtonElement>document.getElementById("transpose-by-halftones-btn");
    transposeByKey = <HTMLSelectElement>document.querySelector("#transpose-by-key");
    transposeByKeyBtn = <HTMLButtonElement>document.getElementById("transpose-by-key-btn");
    transposeByKeyOctave = <HTMLInputElement>document.getElementById("transpose-by-key-octave");
    transposeByInterval = <HTMLSelectElement>document.getElementById("transpose-by-interval");
    transposeByIntervalBtn = <HTMLButtonElement>document.getElementById("transpose-by-interval-btn");
    transposeKeySignatures = <HTMLInputElement>document.getElementById("transpose-key-signatures");
    transposeDiatonically = <HTMLSelectElement>document.getElementById("transpose-diatonically");
    transposeDiatonicallyBtn = <HTMLButtonElement>document.getElementById("transpose-diatonically-btn");
    removeKeySignatures = <HTMLButtonElement>document.getElementById("remove-key-signatures");

    selectSample.addEventListener("change",(ev)=>{
        selectSampleOnChange();
    });
    if(transposeByKeyBtn && transposeByKey){
        transposeByKeyBtn.onclick = function(): void {
            const key: number = Number(transposeByKey.value);
            const octave: number = Number(transposeByKeyOctave.value);
            openSheetMusicDisplay.TransposeCalculator.Options.transposeToKeyRelation(key,octave);
            openSheetMusicDisplay.updateGraphic();
            rerender();
        };
    }
    if(transposeByHalftonesBtn && transposeByHalftones){
        transposeByHalftonesBtn.onclick = function(): void{
            openSheetMusicDisplay.TransposeCalculator.Options.TransposeByHalftone = true;
            const transposeValue: number = Number(transposeByHalftones.value);
            openSheetMusicDisplay.TransposeCalculator.Options.transposeToHalftone(transposeValue);
            openSheetMusicDisplay.updateGraphic();
            rerender();
        };
    }
    if(transposeByIntervalBtn && transposeByInterval){
        transposeByIntervalBtn.onclick = function(): void {
            const transposeValue: number = ETC.commaIntervals[transposeByInterval.value];
            openSheetMusicDisplay.TransposeCalculator.Options.transposeToInterval(transposeValue);
            openSheetMusicDisplay.updateGraphic();
            rerender();
        };
    }
    if(transposeKeySignatures){
        transposeKeySignatures.onchange = function(): void{
            openSheetMusicDisplay.TransposeCalculator.Options.TransposeKeySignatures = Boolean(transposeKeySignatures.checked);
        };
    }
    if(transposeDiatonicallyBtn && transposeDiatonically){
        transposeDiatonicallyBtn.onclick = function(): void{
            const transposeValue: number = Number(transposeDiatonically.value);
            openSheetMusicDisplay.TransposeCalculator.Options.transposeToDiatonic(transposeValue);
            openSheetMusicDisplay.updateGraphic();
            rerender();
        };
    }

    if(removeKeySignatures){
        removeKeySignatures.onclick = function(): void{
            openSheetMusicDisplay.TransposeCalculator.Options.removeKeySignatures();
            openSheetMusicDisplay.updateGraphic();
            rerender();
        };
    }

    samples.forEach((sample: string[]) => {
        const option: HTMLOptionElement = document.createElement("option");
        option.value = sample[1];
        option.textContent = sample[0];
        selectSample.appendChild(option);
    });

    openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, {
        autoResize: true,
        disableCursor: false,
        drawPartNames: true,
        drawFingerings: true,
        setWantedStemDirectionByXml: true,
        useXMLMeasureNumbers: true,
        coloringEnabled: true,
        autoBeam: false
    });
    osmdVersion.innerHTML = `(on OpenSheetMusicDisplay v${openSheetMusicDisplay.Version})`;
    // necessary for using osmd.Sheet.Transpose and osmd.Sheet.Instruments[i].Transpose
    openSheetMusicDisplay.TransposeCalculator = new ExtendedTransposeCalculator(openSheetMusicDisplay);
    selectSampleOnChange();
});
