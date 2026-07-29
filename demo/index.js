import { OpenSheetMusicDisplay } from '../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay';
import { BrailleConverter } from '../src/Plugins/Braille/BrailleConverter';
import { BackendType } from '../src/OpenSheetMusicDisplay/OSMDOptions';
import * as jsPDF  from '../node_modules/jspdf/dist/jspdf.es.min';
import * as svg2pdf from '../node_modules/svg2pdf.js/dist/svg2pdf.umd.min';
import { TransposeCalculator } from '../src/Plugins/Transpose/TransposeCalculator';

/*jslint browser:true */
(function () {
    "use strict";
    var openSheetMusicDisplay;
    var sampleFolder = "",
        samples = {
            "Beethoven, L.v. - An die ferne Geliebte": "Beethoven_AnDieFerneGeliebte.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.1": "MuzioClementi_SonatinaOpus36No3_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.2": "MuzioClementi_SonatinaOpus36No3_Part2.xml",
            "Bach, J.S. - Praeludium in C-Dur BWV846 1": "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
            "Bach, J.S. - Air": "JohannSebastianBach_Air.xml",
            "Gounod, C. - Méditation": "CharlesGounod_Meditation.xml",
            "Haydn, J. - Concertante Cello": "JosephHaydn_ConcertanteCello.xml",
            "Joplin, S. - Elite Syncopations": "ScottJoplin_EliteSyncopations.xml",
            "Joplin, S. - The Entertainer": "ScottJoplin_The_Entertainer.xml",
            "Mozart, W.A. - An Chloe": "Mozart_AnChloe.xml",
            "Mozart, W.A. - Das Veilchen": "Mozart_DasVeilchen.xml",
            "Mozart, W.A. - Clarinet Quintet (Excerpt)": "Mozart_Clarinet_Quintet_Excerpt.mxl",
            "Mozart, W.A. - String Quartet in G, K. 387, 1st Mvmt Excerpt": "Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml",
            "Mozart/Holzer - Land der Berge (national anthem of Austria)": "Land_der_Berge.musicxml",
            "OSMD Function Test - All": "OSMD_function_test_all.xml",
            "OSMD Function Test - Accidentals": "OSMD_function_test_accidentals.musicxml",
            "OSMD Function Test - Autobeam": "OSMD_function_test_autobeam.musicxml",
            "OSMD Function Test - Auto-/Custom-Coloring": "OSMD_function_test_auto-custom-coloring-entchen.musicxml",
            "OSMD Function Test - Bar lines": "OSMD_function_test_bar_lines.musicxml",
            "OSMD Function Test - Chord Symbols": "OSMD_function_test_chord_symbols.musicxml",
            "OSMD Function Test - Chord Spacing": "OSMD_function_test_chord_spacing.mxl",
            "OSMD Function Test - Chord Symbols - Various Chords": "OSMD_function_test_chord_tests_various.musicxml",
            "OSMD Function Test - Chord Symbols - BrookeWestSample": "BrookeWestSample.mxl",
            "OSMD Function Test - Color (from XML)": "OSMD_function_test_color.musicxml",
            "OSMD Function Test - Container height (compacttight mode)": "OSMD_Function_Test_Container_height.musicxml",
            "OSMD Function Test - Drumset": "OSMD_function_test_drumset.musicxml",
            "OSMD Function Test - Drums on one Line": "OSMD_Function_Test_Drums_one_line_snare_plus_piano.musicxml", 
            "OSMD Function Test - Expressions": "OSMD_function_test_expressions.musicxml",
            "OSMD Function Test - Expressions Overlap": "OSMD_function_test_expressions_overlap.musicxml",
            "OSMD Function Test - Grace Notes": "OSMD_function_test_GraceNotes.xml",
            "OSMD Function Test - Metronome Marks": "OSMD_function_test_metronome_marks.mxl",
            "OSMD Function Test - Multiple Rest Measures": "OSMD_function_test_multiple_rest_measures.musicxml",
            "OSMD Function Test - Invisible Notes": "OSMD_function_test_invisible_notes.musicxml",
            "OSMD Function Test - Notehead Shapes": "OSMD_function_test_noteheadShapes.musicxml",
            "OSMD Function Test - Ornaments": "OSMD_function_test_Ornaments.xml",
            "OSMD Function Test - Pedals": "OSMD_Function_Test_Pedals.musicxml",
            "OSMD Function Test - Selecting Measures To Draw": "OSMD_function_test_measuresToDraw_Beethoven_AnDieFerneGeliebte.xml",
            "OSMD Function Test - System and Page Breaks": "OSMD_Function_Test_System_and_Page_Breaks_4_pages.mxl",
            "OSMD Function Test - Tabulature": "OSMD_Function_Test_Tabulature_hayden_study_1.mxl",
            "OSMD Function Test - Tabulature MultiBends": "OSMD_Function_Test_Tablature_Multibends.musicxml",
            "OSMD Function Test - Tabulature All Effects": "OSMD_Function_Test_Tablature_Alleffects.musicxml",
            "OSMD Function Test - Tremolo": "OSMD_Function_Test_Tremolo_2bars.musicxml",
            "OSMD Function Test - Tremolo between two notes": "test_tremolo_between_notes.musicxml",
            "OSMD Function Test - Labels": "OSMD_Function_Test_Labels.musicxml",
            "OSMD Function Test - High Slur Test": "test_slurs_highNotes.musicxml",
            "OSMD Function Test - Auto Multirest Measures Single Staff": "Test_Auto_Multirest_1.musicxml",
            "OSMD Function Test - Auto Multirest Measures Multiple Staves": "Test_Auto_Multirest_2.musicxml",
            "OSMD Function Test - String number collisions": "test_string_number_collisions.musicxml",
            "OSMD Function Test - Repeat Stave Connectors": "OSMD_function_Test_Repeat.musicxml",
            "OSMD Function Test - Voice Alignment": "OSMD_Function_Test_Voice_Alignment.musicxml",
            "Schubert, F. - An Die Musik": "Schubert_An_die_Musik.xml",
            "Actor, L. - Prelude (Large Sample, loading time)": "ActorPreludeSample.xml",
            "Actor, L. - Prelude (Large, No Print Part Names)": "ActorPreludeSample_PartName.xml",
            "Anonymous - Saltarello": "Saltarello.mxl",
            "Debussy, C. - Mandoline": "Debussy_Mandoline.xml",
            "Levasseur, F. - Parlez Mois": "Parlez-moi.mxl",
            "Schumann, R. - Dichterliebe": "Dichterliebe01.xml",
            "Telemann, G.P. - Sonate-Nr.1.1-Dolce": "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
            "Telemann, G.P. - Sonate-Nr.1.2-Allegro": "TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml",
            // Music Braille demo samples, kept at the bottom (niche feature). Selecting one switches the
            //   braille display on automatically (see setSampleSpecificOptions). These five showcase the
            //   main braille formats; the full set of ~28 test_Braille_* files remains in test/data.
            "Music Braille Test - Accidentals": "test_Braille_Accidentals.musicxml",
            "Music Braille Test - Lyrics": "test_Braille_Lyrics_Simple.musicxml",
            "Music Braille Test - Bar-over-bar (Piano)": "test_Braille_BarOverBar.musicxml",
            "Music Braille Test - Ensemble (String Quartet)": "test_Braille_Ensemble_Quartet.musicxml",
            "Music Braille Test - Facsimile": "test_Braille_Facsimile_option.musicxml", // also switches facsimile mode on (see setSampleSpecificOptions)
        },

        zoom = 1.0,
        // HTML Elements in the page
        divControls,
        zoomControls,
        zoomControlsButtons,
        header,
        err,
        error_tr,
        canvas,
        openFileBtn,
        openFileInput,
        selectSample,
        selectBounding,
        skylineDebug,
        bottomlineDebug,
        zoomIns,
        zoomOuts,
        zoomDivs,
        custom,
        previousCursorBtn,
        nextCursorBtn,
        resetCursorBtn,
        followCursorCheckbox,
        incrementalCheckbox,
        showCursorBtn,
        hideCursorBtn,
        debugReRenderBtn,
        debugClearBtn,
        selectPageSizes,
        printPdfBtns,
        darkModeBtn,
        transpose,
        transposeBtn,
        versionDiv,
        // Music Braille demo option elements (see the "Music Braille" section at the bottom of this file)
        brailleContainer,
        brailleOptionsDetails,
        brailleShowCheckbox,
        brailleShowClassicalCheckbox,
        brailleLyricsCheckbox,
        brailleFacsimileCheckbox,
        brailleBarOverBarCheckbox,
        brailleEnsembleCheckbox;
    
    // manage option setting and resetting for specific samples, e.g. in the autobeam sample autobeam is set to true, otherwise reset to previous state
    // TODO design a more elegant option state saving & restoring system, though that requires saving the options state in OSMD
    var minMeasureToDrawStashed = 1;
    var maxMeasureToDrawStashed = Number.MAX_SAFE_INTEGER;
    var measureToDrawRangeNeedsReset = false;
    var drawingParametersStashed = "default";
    var drawingParametersNeedsReset = false;
    var autobeamOptionNeedsReset = false;
    var autobeamOptionStashedValue = false;
    var autoCustomColoringOptionNeedsReset = false;
    var autoCustomColoringOptionStashedValue = false;
    var drawPartNamesOptionStashedValue = true;
    var drawPartAbbreviationsStashedValue = true;
    var drawPartNamesOptionNeedsReset = false;
    var pageBreaksOptionStashedValue = false;
    var pageBreaksOptionNeedsReset = false;
    var systemBreaksOptionStashedValue = false; // reset handled by pageBreaksOptionNeedsReset
    // Music Braille sample stashes (see the braille hooks in setSampleSpecificOptions):
    var brailleSampleNeedsReset = false;
    var brailleSampleStashedShowBraille = false; // braille display state before a braille sample switched it on
    var brailleFacsimileSampleNeedsReset = false;
    var brailleFacsimileSampleStashedCheckbox = false; // facsimile checkbox state before the facsimile sample forced it on
    var brailleFacsimileSampleStashedSystemBreaks = false; // NewSystemAtXMLNewSystemAttribute before the facsimile sample forced it on
    var sheetRendered = false; // whether osmd.render() ran for the currently loaded sheet (see "Show classical score (above braille)" option)

    var showControls = true;
    var showExportPdfControl = false;
    var showPageFormatControl = false;
    var showZoomControl = true;
    var showHeader = true;
    var showVersionHeader = true;
    var showDebugControls = false;

    document.title = "OpenSheetMusicDisplay Demo";

    // Initialization code
    function init() {
        var name, option;

        // Handle window parameter
        var paramEmbedded = findGetParameter('embedded');
        var paramShowControls = findGetParameter('showControls');
        var paramShowPageFormatControl = findGetParameter('showPageFormatControl');
        var paramShowExportPdfControl = findGetParameter('showExportPdfControl');
        var paramShowZoomControl = findGetParameter('showZoomControl');
        var paramShowHeader = findGetParameter('showHeader');
        var paramShowVersionHeader = findGetParameter('showVersionHeader'); // versionDiv
        var paramZoom = findGetParameter('zoom');
        var paramOverflow = findGetParameter('overflow');
        var paramDarkMode = findGetParameter('darkMode');
        var paramOpenUrl = findGetParameter('openUrl');
        var paramDebugControls = findGetParameter('debugControls');

        var paramCompactMode = findGetParameter('compactMode');
        var paramMeasureRangeStart = findGetParameter('measureRangeStart');
        var paramMeasureRangeEnd = findGetParameter('measureRangeEnd');
        var paramPageFormat = findGetParameter('pageFormat');
        var paramPageBackgroundColor = findGetParameter('pageBackgroundColor');
        var paramBackendType = findGetParameter('backendType');
        var paramPageWidth = findGetParameter('pageWidth');
        var paramPageHeight = findGetParameter('pageHeight');

        var paramHorizontalScrolling = findGetParameter('horizontalScrolling');
        var paramSingleHorizontalStaffline = findGetParameter('singleHorizontalStaffline');

        showHeader = (paramShowHeader !== '0');
        showVersionHeader = (paramShowVersionHeader !== '0');
        showControls = false;
        if (paramEmbedded) {
            showControls = paramShowControls !== '0';
            showZoomControl = paramShowZoomControl !== '0';
            showPageFormatControl = paramShowPageFormatControl !== '0';
            showExportPdfControl = paramShowExportPdfControl !== '0';
        }

        if (paramZoom) {
            if (paramZoom > 0.1 && paramZoom < 5.0) {
                zoom = paramZoom;
            }
        }
        if (paramOverflow && typeof paramOverflow === 'string') {
            if (paramOverflow === 'hidden' || paramOverflow === 'auto' || paramOverflow === 'scroll' || paramOverflow === 'visible') {
                document.body.style.overflow = paramOverflow;
            }
        }
        
        var compactMode = paramCompactMode && paramCompactMode !== '0';
        var measureRangeStart = paramMeasureRangeStart ? Number.parseInt(paramMeasureRangeStart) : 0;
        var measureRangeEnd = paramMeasureRangeEnd ? Number.parseInt(paramMeasureRangeEnd) : Number.MAX_SAFE_INTEGER;
        if (measureRangeStart && measureRangeEnd && measureRangeEnd < measureRangeStart) {
            console.log("[OSMD] warning: measure range end parameter should not be smaller than measure range start. We've set start measure = end measure now.")
            measureRangeStart = measureRangeEnd;
        }
        let pageFormat = paramPageFormat ? paramPageFormat : "Endless";
        if (paramPageHeight && paramPageWidth) {
            pageFormat = `${paramPageWidth}x${paramPageHeight}`
        }
        var pageBackgroundColor = paramPageBackgroundColor ? "#" + paramPageBackgroundColor : undefined; // vexflow format, see OSMDOptions. can't use # in parameters.
        //console.log("demo: osmd pagebgcolor: " + pageBackgroundColor);
        var backendType = (paramBackendType && paramBackendType.toLowerCase) ? paramBackendType : "svg";

        var horizontalScrolling = paramHorizontalScrolling === '1';
        var singleHorizontalStaffline = paramSingleHorizontalStaffline === '1';
        

        divControls = document.getElementById('divControls');
        zoomControls = document.getElementById('zoomControls');
        header = document.getElementById('header');
        err = document.getElementById("error-td");
        error_tr = document.getElementById("error-tr");
        zoomDivs = [];
        zoomDivs.push(document.getElementById("zoom-str"));
        zoomDivs.push(document.getElementById("zoom-str-portrait"));
        zoomDivs.push(document.getElementById("zoom-str-optional"));
        custom = document.createElement("option");
        selectSample = document.getElementById("selectSample");
        selectBounding = document.getElementById("selectBounding");
        skylineDebug = document.getElementById("skylineDebug");
        bottomlineDebug = document.getElementById("bottomlineDebug");
        zoomIns = [];
        zoomIns.push(document.getElementById("zoom-in-btn"));
        zoomIns.push(document.getElementById("zoom-in-btn-optional"));
        zoomOuts = [];
        zoomOuts.push(document.getElementById("zoom-out-btn"));
        zoomOuts.push(document.getElementById("zoom-out-btn-optional"));
        canvas = document.createElement("div");
        if (horizontalScrolling) {
            canvas.style.overflowX = 'auto'; // enable horizontal scrolling
        }
        canvas.id = 'osmdCanvasDiv';
        //canvas.style.overflowX = 'auto'; // enable horizontal scrolling
        previousCursorBtn = document.getElementById("previous-cursor-btn");
        nextCursorBtn = document.getElementById("next-cursor-btn");
        resetCursorBtn = document.getElementById("reset-cursor-btn");
        followCursorCheckbox = document.getElementById("follow-cursor-checkbox");
        incrementalCheckbox = document.getElementById("incremental-checkbox");
        openFileBtn = document.getElementById("open-file-btn");
        openFileInput = document.getElementById("open-file-input");
        showCursorBtn = document.getElementById("show-cursor-btn");
        hideCursorBtn = document.getElementById("hide-cursor-btn");
        debugReRenderBtn = document.getElementById("debug-re-render-btn");
        debugClearBtn = document.getElementById("debug-clear-btn");
        selectPageSizes = [];
        selectPageSizes.push(document.getElementById("selectPageSize"));
        selectPageSizes.push(document.getElementById("selectPageSize-optional"));
        printPdfBtns = [];
        printPdfBtns.push(document.getElementById("print-pdf-btn"));
        printPdfBtns.push(document.getElementById("print-pdf-btn-optional"));
        darkModeBtn = document.getElementById("dark-mode-btn");
        transpose = document.getElementById('transpose');
        transposeBtn = document.getElementById('transpose-btn');
        versionDiv = document.getElementById('versionDiv');
        zoomControlsButtons = document.getElementById('zoomControlsButtons')

        // ── Music Braille demo option (see the "Music Braille" section at the bottom of this file) ──
        brailleContainer = document.createElement("div");
        brailleContainer.id = 'brailleContainer'; // so demo.css can reserve sidebar width like #osmdCanvasDiv
        brailleOptionsDetails = document.getElementById("brailleOptionsDetails");
        brailleShowCheckbox = document.getElementById("braille-show-checkbox");
        brailleShowClassicalCheckbox = document.getElementById("braille-show-classical-checkbox");
        brailleLyricsCheckbox = document.getElementById("braille-lyrics-checkbox");
        brailleFacsimileCheckbox = document.getElementById("braille-facsimile-checkbox");
        brailleBarOverBarCheckbox = document.getElementById("braille-bar-over-bar-checkbox");
        brailleEnsembleCheckbox = document.getElementById("braille-ensemble-checkbox");
        if (findGetParameter('braille') === '1' && brailleShowCheckbox) {
            // ?braille=1: start with the Music Braille score displayed and its options section expanded --
            //   lets braille users be linked directly to a braille-enabled demo, without having to find
            //   the collapsed "Music Braille options" section first. Same effect as checking
            //   "Show Music Braille score (below classical)" manually.
            brailleShowCheckbox.checked = true;
            if (brailleOptionsDetails) {
                brailleOptionsDetails.open = true;
            }
        }
        updateClassicalScoreVisibility(); // browsers may also restore changed checkbox states on reload

        //var defaultDisplayVisibleValue = "block"; // TODO in some browsers flow could be the better/default value
        var defaultVisibilityValue = "visible";
        showDebugControls = paramDebugControls !== '0';
        if (showDebugControls) {
            var elementsToEnable = [
                selectSample, selectBounding, selectPageSizes[0], divControls, openFileBtn
            ];
            for (var i=0; i<elementsToEnable.length; i++) {
                if (elementsToEnable[i]) { // make sure this element is not null/exists in the index.html, e.g. github.io demo has different index.html
                    const elementToEnable = elementsToEnable[i];
                    if (elementToEnable.style) {
                        elementToEnable.style.visibility = defaultVisibilityValue;
                        if (elementToEnable.style.opacity === 0) {
                            elementToEnable.style.opacity = 1.0;
                        }
                    }
                }
            }
        } else {
            if (divControls) {
                divControls.style.display = "none";
            }
        }
        // detect mobile portrait mode (small screen -> reduce zoom etc)
        const portrait = window.matchMedia("(orientation: portrait)").matches;
        // console.log(`is portrait mode: ${portrait}`);
        // Detect small screens via the layout viewport, NOT window.outerWidth. outerWidth reads 0 for the
        //   first few tens of milliseconds after a page (re)loads, then settles to the real window width.
        //   If init() runs inside that gap -- e.g. a fast webpack-dev-server hot reload where the JS bundles
        //   are unchanged and served from cache, so the "load" event fires almost immediately -- outerWidth
        //   would be 0 < 768 and wrongly force mobile mode (60% zoom, advanced settings hidden) on desktop.
        //   matchMedia mirrors the CSS breakpoint (demo.css @media (min-width: 768px), and the min-width
        //   check further below) and is correct from the first frame, so the sidebar no longer randomly
        //   collapses after a hot reload.
        const smallScreen = !window.matchMedia("(min-width: 768px)").matches;
        if (smallScreen) {
            zoom = 0.60; // ~60% is good for iPhone SE (browser simulated device dimensions)

            // collapsible behavior
            var coll = document.getElementsByClassName("portraitCollapsible");
            for (var i = 0; i < coll.length; i++) {
                var content = coll[i].nextElementSibling;
                content.style.display = "none";

            coll[i].addEventListener("click", function() {
                this.classList.toggle("active");
                var content = this.nextElementSibling;
                if (content.style.display === "block") {
                    content.style.display = "none";
                } else {
                    content.style.display = "block";
                }
            });
            }
            var adSetBtn = document.getElementById("advanced-settings-btn");
            
            var advSettings = document.getElementsByClassName("advanced-setting");
            for(var i = 0; i < advSettings.length; i++){
                var element = advSettings[i];
                element.style.display = "none";
            }

            if (adSetBtn) {
                adSetBtn.addEventListener("click", function() {
                    this.classList.toggle("active");
                    for(var i = 0; i < advSettings.length; i++){
                        var element = advSettings[i];
                        if (element.style.display === "block") {
                            element.style.display = "none";
                        } else {
                            element.style.display = "block";
                        }
                    }
                }); 
            }
        }

        var slideButton = document.getElementById("slideControlsButton");
        if (slideButton) {
            // Minimize/restore the controls sidebar. On desktop the sidebar is solid and reserves width
            //   (see demo.css: #divControls + #osmdCanvasDiv margin-left), so collapsing/expanding it changes the
            //   score width and needs a re-render. We re-render only once -- when the slide finishes (collapse) or
            //   right away (expand) -- not on every animation frame. The slide itself is a CSS transform transition.
            //   The arrow icon is swapped via CSS (body.controls-collapsed #slideControlsButton).
            slideButton.onclick = function slideButtonClicked(){
                var collapsed = document.body.classList.toggle("controls-collapsed");
                if (!window.matchMedia("(min-width: 768px)").matches) {
                    return; // mobile/portrait uses its own collapsible; there is no reserved width to reclaim
                }
                if (collapsed) {
                    // wait until the sidebar has slid out, then hand the freed width to the score
                    var onSlideEnd = function(e){
                        if (e.target !== divControls || e.propertyName !== "transform") {
                            return;
                        }
                        divControls.removeEventListener("transitionend", onSlideEnd);
                        if (document.body.classList.contains("controls-collapsed")) { // not toggled back meanwhile
                            canvas.style.marginLeft = "0px";
                            renderAndScrollBack();
                        }
                    };
                    divControls.addEventListener("transitionend", onSlideEnd);
                } else {
                    // restore the reserved width (CSS-driven, breakpoint-correct) and re-render, then the sidebar slides back in
                    canvas.style.marginLeft = "";
                    renderAndScrollBack();
                }
            };
        }

        const optionalControls = document.getElementById('optionalControls');
        if (optionalControls) {
            if (showControls) {
                optionalControls.style.visibility = defaultVisibilityValue;
                optionalControls.style.opacity = 0.8;
            } else {
                optionalControls.style.display = 'none';
            }
        }

        if (!showHeader) {
            if (header) {
                header.style.display = 'none';
                if (versionDiv) {
                    versionDiv.style.marginTop = "5px"; // default 80px
                }
            }
        } else {
            if (header) {
                header.style.opacity = 1.0;
            }
        }
        if (!showVersionHeader) {
            if (versionDiv) {
                versionDiv.style.display = 'none';
            }
        }
        // Hide error
        error();

        if (showControls) {
            const optionalControls = document.getElementById('optionalControls');
            if (optionalControls) {
                optionalControls.style.opacity = 1.0;
                // optionalControls.appendChild(zoomControlsButtons);
                // optionalControls.appendChild(zoomControlsString);
                optionalControls.style.position = 'absolute';
                optionalControls.style.zIndex = '10';
                optionalControls.style.right = '10px';
                // optionalControls.style.padding = '10px';
            }

            if (showZoomControl) {
                const zoomControlsButtonsColumn = document.getElementById('zoomControlsButtons-optional-column');
                zoomControlsButtonsColumn.style.opacity = 1.0;
                // const zoomControlsButtons = document.getElementById('zoomControlsButtons-optional');
                // zoomControlsButtons.style.opacity = 1.0;
                const zoomControlsString = document.getElementById('zoom-str-optional'); // actually === zoomDivs[1] above

                if (zoomControlsString) {
                    zoomControlsString.innerHTML = Math.floor(zoom * 100.0) + "%";
                    zoomControlsString.style.display = 'inline';
                    // zoomControlsString.style.padding = '10px';
                }
            }

            if (showExportPdfControl) {
                const exportPdfButtonColumn = document.getElementById('print-pdf-btn-optional-column');
                if (exportPdfButtonColumn) {
                    exportPdfButtonColumn.style.opacity = 1.0;
                }
            }

            const pageFormatControlColumn = document.getElementById("selectPageSize-optional-column");
            if (pageFormatControlColumn) {
                if (showPageFormatControl) {
                    pageFormatControlColumn.style.opacity = 1.0;
                } else {
                    // showPageFormatControlColumn.innerHTML = "";
                    // pageFormatControlColumn.style.minWidth = 0;
                    // pageFormatControlColumn.style.width = 0;
                    pageFormatControlColumn.style.display = 'none'; // squeezes buttons/columns
                    // pageFormatControlColumn.style.visibility = 'hidden';

                    // const optionalControlsColumnContainer = document.getElementById("optionalControlsColumnContainer");
                    // optionalControlsColumnContainer.removeChild(pageFormatControlColumn);
                    // optionalControlsColumnContainer.width *= 0.66;
                    // optionalControls.witdh *= 0.66;
                    // optionalControls.focus();
                }
            }
        }

        // Create select
        for (name in samples) {
            if (samples.hasOwnProperty(name)) {
                option = document.createElement("option");
                option.value = samples[name];
                option.textContent = name;
            }
            if (selectSample) {
                selectSample.appendChild(option);
            }
        }
        if (selectSample) {
            selectSample.onchange = selectSampleOnChange;
        }
        if (selectBounding) {
            selectBounding.onchange = selectBoundingOnChange;
        }

        for (const selectPageSize of selectPageSizes) {
            if (selectPageSize) {
                selectPageSize.onchange = function (evt) {
                    var value = evt.target.value;
                    openSheetMusicDisplay.setPageFormat(value);
                    renderAndScrollBack();
                };
            }
        }

        for (const printPdfBtn of printPdfBtns) {
            if (printPdfBtn) {
                printPdfBtn.onclick = function () {
                    createPdf();
                }
            }
        }

        if (darkModeBtn) {
            darkModeBtn.onclick = function() {
                osmd.setOptions({
                    darkMode: !osmd.EngravingRules.DarkModeEnabled // toggle to opposite of current value (on/off)
                });
                renderAndScrollBack();
            }
        }

        // Pre-select default music piece

        custom.appendChild(document.createTextNode("Custom"));

        // Create zoom controls
        for (const zoomIn of zoomIns) {
            if (zoomIn) {
                zoomIn.onclick = function () {
                    zoom *= 1.2;
                    scale();
                };
            }
        }
        for (const zoomOut of zoomOuts) {
            if (zoomOut) {
                zoomOut.onclick = function () {
                    zoom /= 1.2;
                    scale();
                };
            }
        }

        if (skylineDebug) {
            skylineDebug.onclick = function () {
                openSheetMusicDisplay.DrawSkyLine = !openSheetMusicDisplay.DrawSkyLine;
                renderAndScrollBack();
            }
        }

        if (bottomlineDebug) {
            bottomlineDebug.onclick = function () {
                openSheetMusicDisplay.DrawBottomLine = !openSheetMusicDisplay.DrawBottomLine;
                renderAndScrollBack();
            }
        }

        if (openFileBtn && openFileInput) {
            // "Open file..." next to the sample select: an accessible alternative to drag&drop for
            //   loading your own files -- a native file dialog works with keyboard and screen reader alone.
            //   The visible, aria-labeled button forwards the click to the hidden <input type=file>
            //   (display:none also removes the input from the accessibility tree), so NVDA & co announce
            //   a single, properly named control instead of the browser's default file widget.
            openFileBtn.onclick = function () {
                openFileInput.click();
            };
            openFileInput.onchange = function () {
                if (openFileInput.files && openFileInput.files.length > 0) {
                    openLocalFile(openFileInput.files[0]);
                }
                openFileInput.value = ""; // reset so picking the same file again still fires onchange
            };
        }

        if (debugReRenderBtn) {
            debugReRenderBtn.onclick = function () {
                rerender();
            }
        }

        if (debugClearBtn) {
            debugClearBtn.onclick = function () {
                openSheetMusicDisplay.clear();
            }
        }

        // ── Music Braille option checkboxes (see the "Music Braille" section at the bottom of this file) ──
        if (brailleShowCheckbox) {
            // Master toggle: converts and shows the Music Braille score below the classical one, or removes it.
            brailleShowCheckbox.onchange = function () {
                updateClassicalScoreVisibility(); // switching braille off forces the classical score back on
                if (classicalScoreEnabled() || (brailleEnabled() && brailleFacsimileCheckbox && brailleFacsimileCheckbox.checked)) {
                    ensureSheetRendered();
                }
                renderBraille(); // renders, or clears the braille output when it was just switched off
            }
        }

        if (brailleShowClassicalCheckbox) {
            // Toggle the classical (non-braille) score above the braille (only effective while the braille
            //   score is shown). Unchecking hides it and skips rendering for subsequently loaded scores,
            //   which makes large scores load much faster -- osmd.load() alone builds the data model the
            //   braille conversion reads. Re-checking shows the score again and renders the current sheet
            //   if it was loaded without rendering.
            brailleShowClassicalCheckbox.onchange = function () {
                updateClassicalScoreVisibility();
                if (classicalScoreEnabled()) {
                    ensureSheetRendered();
                }
                // the braille output itself is unaffected -- no re-conversion needed
            }
        }

        if (brailleLyricsCheckbox) {
            // re-convert the already-loaded sheet with the new lyrics setting; no reload/re-render of the score needed
            brailleLyricsCheckbox.onchange = function () {
                renderBraille();
            }
        }

        if (brailleFacsimileCheckbox) {
            // facsimile reads the rendered GraphicSheet. Normally the score is already rendered; if it
            //   was loaded without rendering ("Show classical score (above braille)" off), render it now
            //   (it stays hidden via CSS). Then re-convert the braille -- no score reload needed.
            brailleFacsimileCheckbox.onchange = function () {
                if (brailleFacsimileCheckbox.checked) {
                    ensureSheetRendered();
                }
                renderBraille();
            }
        }

        if (brailleBarOverBarCheckbox) {
            // bar-over-bar is a pure re-conversion of the loaded sheet; no score reload/re-render needed
            brailleBarOverBarCheckbox.onchange = function () {
                renderBraille();
            }
        }

        if (brailleEnsembleCheckbox) {
            // ensemble is a pure re-conversion of the loaded sheet; no score reload/re-render needed
            brailleEnsembleCheckbox.onchange = function () {
                renderBraille();
            }
        }

        // Create OSMD object and canvas
        openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, {
            autoResize: true,
            backend: backendType,
            //backend: "canvas",
            //cursorsOptions: [{type: 3, color: "#2bb8cd", alpha: 0.6, follow: true}], // highlight current measure instead of just a small vertical bar over approximate notes
            disableCursor: false,
            drawingParameters: compactMode ? "compact" : "default", // try compact (instead of default)
            drawPartNames: true, // try false
            // drawTitle: false,
            // drawSubtitle: false,
            drawFingerings: true,
            //fingeringPosition: "left", // Above/Below is default. try left or right. experimental: above, below.
            //fingeringPositionFromXML: false, // do this if you want them always left, for example.
            // fingeringInsideStafflines: "true", // default: false. true draws fingerings directly above/below notes
            setWantedStemDirectionByXml: true, // try false, which was previously the default behavior
            // drawUpToMeasureNumber: 3, // draws only up to measure 3, meaning it draws measure 1 to 3 of the piece.
            drawFromMeasureNumber : measureRangeStart,
            drawUpToMeasureNumber : measureRangeEnd,

            //drawMeasureNumbers: false, // disable drawing measure numbers
            //measureNumberInterval: 4, // draw measure numbers only every 4 bars (and at the beginning of a new system)
            useXMLMeasureNumbers: true, // read measure numbers from xml

            // coloring options
            coloringEnabled: true,
            // defaultColorNotehead: "#CC0055", // try setting a default color. default is black (undefined)
            // defaultColorStem: "#BB0099",

            autoBeam: false, // try true, OSMD Function Test AutoBeam sample
            autoBeamOptions: {
                beam_rests: false,
                beam_middle_rests_only: false,
                //groups: [[3,4], [1,1]],
                maintain_stem_directions: false
            },
            pageFormat: pageFormat,
            pageBackgroundColor: pageBackgroundColor,
            renderSingleHorizontalStaffline: singleHorizontalStaffline

            // tupletsBracketed: true, // creates brackets for all tuplets except triplets, even when not set by xml
            // tripletsBracketed: true,
            // tupletsRatioed: true, // unconventional; renders ratios for tuplets (3:2 instead of 3 for triplets)
        });
        if (portrait) {
            // reduce title labels/text size etc. as well. E.g. for Mozart string quartet, title wouldn't fit line width otherwise
            openSheetMusicDisplay.EngravingRules.SheetTitleHeight *= 0.7; // see Mozart String Quartet
            // reducing size for subtitle/composer/lyricist is probably unnecessary and makes them too small:
            // openSheetMusicDisplay.EngravingRules.SheetSubtitleHeight *= 0.9;
            // openSheetMusicDisplay.EngravingRules.SheetComposerHeight *= 0.9;
            // openSheetMusicDisplay.EngravingRules.SheetAuthorHeight *= 0.9; // affects lyricist label, maybe should be renamed
        }
        openSheetMusicDisplay.TransposeCalculator = new TransposeCalculator(); // necessary for using osmd.Sheet.Transpose and osmd.Sheet.Instruments[i].Transpose
        //openSheetMusicDisplay.DrawSkyLine = true;
        //openSheetMusicDisplay.DrawBottomLine = true;
        //openSheetMusicDisplay.setDrawBoundingBox("GraphicalLabel", false);
        openSheetMusicDisplay.setLogLevel('info'); // set this to 'debug' if you want to see more detailed control flow information in console
        document.body.appendChild(canvas);
        document.body.appendChild(brailleContainer); // braille output target -- stays empty until the braille option is enabled

        if (versionDiv) {
            versionDiv.innerHTML = "OSMD Version: " + openSheetMusicDisplay.Version.replace("-release", "").replace("-dev", "");
        }

        window.addEventListener("keydown", function (e) {
            var event = window.event ? window.event : e;
            // left arrow key
            if (event.keyCode === 37) {
                openSheetMusicDisplay.cursor.previous();
            }
            // right arrow key
            if (event.keyCode === 39) {
                openSheetMusicDisplay.cursor.next();
            }
        });
        previousCursorBtn?.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.previous();
        });
        nextCursorBtn.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.next();
        });
        resetCursorBtn.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.reset();
        });
        if (followCursorCheckbox) {
            followCursorCheckbox.onclick = function () {
                openSheetMusicDisplay.FollowCursor = !openSheetMusicDisplay.FollowCursor;
            }
        }
        if (incrementalCheckbox) {
            incrementalCheckbox.onchange = function () {
                renderAndScrollBack(); // re-render in the newly selected mode (incremental on, full off)
            }
        }
        hideCursorBtn.addEventListener("click", function () {
            if (openSheetMusicDisplay.cursor) {
                openSheetMusicDisplay.cursor.hide();
            } else {
                console.info("Can't hide cursor, as it was disabled (e.g. by drawingParameters).");
            }
        });
        showCursorBtn.addEventListener("click", function () {
            if (openSheetMusicDisplay.cursor) {
                openSheetMusicDisplay.cursor.show();
            } else {
                console.info("Can't show cursor, as it was disabled (e.g. by drawingParameters).");
            }
        });

        if(transposeBtn && transpose){
            transposeBtn.onclick = function(){
                var transposeValue = parseInt(transpose.value);
                openSheetMusicDisplay.Sheet.Transpose = transposeValue;
                openSheetMusicDisplay.updateGraphic();
                rerender();
            }
        }

        if (paramDarkMode) {
            openSheetMusicDisplay.setOptions({darkMode: true});
        }
        // TODO after selectSampleOnChange, the resize handler triggers immediately,
        //   so we render twice at the start of the demo.
        //   maybe delay the first osmd render, e.g. when window ready?
        if (paramOpenUrl) {
            if (openSheetMusicDisplay.getLogLevel() < 2) { // debug or trace
                console.log("[OSMD] selectSampleOnChange with " + paramOpenUrl);
            }
            // DEBUG: cause an error for a certain sample, for testing
            // if (paramOpenUrl.startsWith("Beethoven")) {
            //     paramOpenUrl.causeError();
            // }
            paramOpenUrl = decodeURIComponent(paramOpenUrl);
            selectSampleOnChange(paramOpenUrl);
        } else {
            if (openSheetMusicDisplay.getLogLevel() < 2) { // debug or trace
                console.log("[OSMD] selectSampleOnChange without param");
            }
            selectSampleOnChange();
        }
    }

    /** Re-render and scroll back to previous scroll bar y position in percent.
     * If the document keeps the same height/length, the scroll bar position will basically be unchanged.
     * If you just call render() instead of renderAndScrollBack(),
     *   it will scroll you back to the top of the page, even if you were scrolled to the bottom before. */
    function renderAndScrollBack() {
        sheetRendered = true; // braille: tracked for the "Show classical score (above braille)" load-without-render path
        if (incrementalCheckbox && incrementalCheckbox.checked) {
            // Incremental ("system by system") rendering: paint the first batch now and append more as the
            //   user scrolls toward the not-yet-rendered edge (page bottom, or the right edge for a single
            //   horizontal staffline). Faster first paint on large scores. Re-entrant: render()/load()/resize
            //   route back here and restart the session cleanly. A normal render() resets it (see OSMD).
            openSheetMusicDisplay.enableIncrementalRenderingOnScroll();
            return; // starts fresh at the top; nothing to scroll back to
        }
        const previousScrollY = window.scrollY;
        const previousScrollHeight = document.body.scrollHeight; // height of page
        const previousScrollYPercent = previousScrollY / previousScrollHeight;
        openSheetMusicDisplay.render();
        const newScrollHeight = document.body.scrollHeight; // height of page
        const newScrollY = newScrollHeight * previousScrollYPercent;
        window.scrollTo({
            top: newScrollY,
            behavior: 'instant' // visually, there is no change in the scroll bar position, as it's the same as before.
        })
    }

    function findGetParameter(parameterName) {
        // special treatment for the openUrl parameter, because different systems attach different arguments to an URL.
        // because of CORS (cross-origin safety restrictions), you can only load an xml file from the same origin (server).

        // test parameter: ?openUrl=https://opensheetmusiceducation.org/index.php?gf-download=2020%2F01%2FJohannSebastianBach_PraeludiumInCDur_BWV846_1.xml&endUrl&form-id=1&field-id=4&hash=c4ba271ef08204a26cbd4cd2d751c53b78f238c25ddbb1f343e1172f2ce2aa53
        //   (enable the console.log at the end of this method for testing)
        // working test parameter in local demo: ?openUrl=OSMD_function_test_all.xml&endUrl
    
        if (parameterName === 'openUrl') {
            let startParameterName = 'openUrl=';
            let startParameterName2 = 'openURL=';
            let endParameterName = '&endUrl';
            let endParameterName2 = '&endURL';
            let openUrlIndex = location.search.indexOf(startParameterName);
            if (openUrlIndex < 0) {
                openUrlIndex = location.search.indexOf(startParameterName2);
                if (openUrlIndex < 0) {
                    return undefined;
                }
            }
            let endIndex = location.search.indexOf(endParameterName) + endParameterName.length;
            if (endIndex < 0) {
                endIndex = location.search.indexOf(endParameterName2) + endParameterName2.length;
                if (endIndex < 0) {
                    console.log("[OSMD] If using openUrl as a parameter, you have to end it with '&endUrl'. openUrl parameter omitted.");
                    return undefined;
                }
            }
            let urlString = location.search.substring(openUrlIndex + startParameterName.length, endIndex - endParameterName.length);
            //console.log("openUrl: " + urlString);
            return urlString;
        }

        let result = undefined;
        let tmp = [];
        location.search
            .substr(1)
            .split('&')
            .forEach(function (item) {
                tmp = item.split('=');
                if (tmp[0] === parameterName) {
                    result = decodeURIComponent(tmp[1]);
                    //console.log('Found param:' + parameterName + ' = ' + result);
                }
            });
        return result;
    }

    function selectBoundingOnChange(evt) {
        var value = evt.target.value;
        openSheetMusicDisplay.DrawBoundingBox = value;
    }

    function selectSampleOnChange(str) {
        error();
        disable();
        var isCustom = typeof str === "string";
        if (!isCustom) {
            if (selectSample) {
                str = sampleFolder + selectSample.value;
            } else {
                if (samples && samples.length > 0) {
                    str = sampleFolder + samples[0];
                } else {
                    return; // no sample to load right now
                }
            }
        }
        // zoom = 1.0;

        setSampleSpecificOptions(str, isCustom);

        openSheetMusicDisplay.load(str).then(
            function () {
                // This gives you access to the osmd object in the console. Do not use in production code
                window.osmd = openSheetMusicDisplay;
                openSheetMusicDisplay.zoom = zoom;
                // openSheetMusicDisplay.Sheet.Instruments[0].Staves[1].Visible = false;
                //openSheetMusicDisplay.Sheet.Transpose = 3; // try transposing between load and first render if you have transpose issues with F# etc

                // braille: settings for the Music Braille samples (e.g. test_Braille_Facsimile_option) are
                //   applied per-sample in setSampleSpecificOptions() (which runs before this load), and
                //   restored when another score loads.
                sheetRendered = false; // fresh data model -- nothing rendered for it yet
                // Braille display on + "Show classical score (above braille)" off skips the classical
                //   (visual) render: load() alone builds the data model the braille conversion reads, so
                //   large scores load much faster. Exception: braille facsimile mode mirrors the rendered
                //   layout (GraphicSheet), so it needs a render -- which stays hidden via CSS in that case.
                //   With the braille display off (the default), this always renders, as before the feature.
                if (classicalScoreEnabled() || (brailleEnabled() && brailleFacsimileCheckbox && brailleFacsimileCheckbox.checked)) {
                    renderAndScrollBack();
                }
                renderBraille(); // no-op (clears the output) unless the braille display is enabled
            },
            function (e) {
                errorLoadingOrRenderingSheet(e, "rendering");
            }
        ).then(
            function () {
                return onLoadingEnd(isCustom);
            }, function (e) {
                errorLoadingOrRenderingSheet(e, "loading");
                onLoadingEnd(isCustom);
            }
        );
    }

    function setSampleSpecificOptions(str, isCustom) {
        if (!isCustom && str.includes("measuresToDraw")) { // set options for measuresToDraw sample
            // stash previously set range of measures to draw
            if (!measureToDrawRangeNeedsReset) { // only stash once, when measuresToDraw called multiple times in a row
                minMeasureToDrawStashed = openSheetMusicDisplay.EngravingRules.MinMeasureToDrawIndex + 1;
                maxMeasureToDrawStashed = openSheetMusicDisplay.EngravingRules.MaxMeasureToDrawIndex + 1;
            }
            measureToDrawRangeNeedsReset = true;

            // for debugging: draw from a random range of measures
            let minMeasureToDraw = Math.ceil(Math.random() * 15); // measures start at 1 (measureIndex = measure number - 1 elsewhere)
            let maxMeasureToDraw = Math.ceil(Math.random() * 15);
            if (minMeasureToDraw > maxMeasureToDraw) {
                minMeasureToDraw = maxMeasureToDraw;
                let a = minMeasureToDraw;
                maxMeasureToDraw = a;
            }
            //minMeasureToDraw = 1; // set your custom indexes here. Drawing only one measure can be a special case
            //maxMeasureToDraw = 1;
            console.log("drawing measures in the range: [" + minMeasureToDraw + "," + maxMeasureToDraw + "]");
            openSheetMusicDisplay.setOptions({
                drawFromMeasureNumber: minMeasureToDraw,
                drawUpToMeasureNumber: maxMeasureToDraw
            });
        } else if (measureToDrawRangeNeedsReset) { // reset for other samples
            openSheetMusicDisplay.setOptions({
                drawFromMeasureNumber: minMeasureToDrawStashed,
                drawUpToMeasureNumber: maxMeasureToDrawStashed
            });
            measureToDrawRangeNeedsReset = false;
        }

        if (!isCustom && str.includes("Test_Container_height")) {
            drawingParametersStashed = openSheetMusicDisplay.drawingParameters.drawingParametersEnum;
            openSheetMusicDisplay.setOptions({
                drawingParameters: "compacttight"
            });
            drawingParametersNeedsReset = true;
        } else if (drawingParametersNeedsReset) {
            openSheetMusicDisplay.setOptions({
                drawingParameters: drawingParametersStashed
            });
            drawingParametersNeedsReset = false;
        }

        // Enable Boomwhacker-like coloring for OSMD Function Test - Auto-Coloring (Boomwhacker-like, custom color set)
        if (!isCustom && str.includes("auto-custom-coloring")) { // set options for auto coloring sample
            autoCustomColoringOptionNeedsReset = true;
            //openSheetMusicDisplay.setOptions({coloringMode: 1}); // Auto-Coloring with pre-defined colors
            openSheetMusicDisplay.setOptions({
                coloringMode: 2, // custom coloring set. 0 would be XML, 1 autocoloring
                coloringSetCustom: ["#d82c6b", "#F89D15", "#FFE21A", "#4dbd5c", "#009D96", "#43469d", "#76429c", "#ff0000"],
                // last color value of coloringSetCustom is for rest notes
                colorStemsLikeNoteheads: true
            });
        } else if (autoCustomColoringOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ // set default values. better would be to restore to stashed values, but unnecessarily complex for demo
                coloringMode: 0,
                colorStemsLikeNoteheads: false,
                coloringSetCustom: null
            });
            autoCustomColoringOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("autobeam")) {
            autobeamOptionStashedValue = openSheetMusicDisplay.EngravingRules.AutoBeamNotes; // stash previously set value, to restore later
            autobeamOptionNeedsReset = true;
            openSheetMusicDisplay.setOptions({ autoBeam: true });
        } else if (autobeamOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ autoBeam: autobeamOptionStashedValue });
            autobeamOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("OSMD_Function_Test_System_and_Page_Breaks")) {
            pageBreaksOptionStashedValue = openSheetMusicDisplay.EngravingRules.NewPageAtXMLNewPageAttribute;
            systemBreaksOptionStashedValue = openSheetMusicDisplay.EngravingRules.NewSystemAtXMLNewSystemAttribute;
            pageBreaksOptionNeedsReset = true;
            openSheetMusicDisplay.setOptions({ newPageFromXML: true, newSystemFromXML: true });
        }
        else if (pageBreaksOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ newPageFromXML: pageBreaksOptionStashedValue, newSystemFromXML: systemBreaksOptionStashedValue });
            pageBreaksOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("Schubert_An_die_Musik")) { // TODO weird layout bug here with part names. but shouldn't be in score anyways
            drawPartNamesOptionStashedValue = openSheetMusicDisplay.EngravingRules.RenderPartNames;
            drawPartAbbreviationsStashedValue = openSheetMusicDisplay.EngravingRules.RenderPartAbbreviations;
            openSheetMusicDisplay.setOptions({ drawPartNames: false, drawPartAbbreviations: false }); // TODO sets osmd.drawingParameters.DrawPartNames! also check EngravingRules.RenderPartAbbreviations, was false
            drawPartNamesOptionNeedsReset = true;
        } else if (drawPartNamesOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ drawPartNames: drawPartNamesOptionStashedValue, drawPartAbbreviations: drawPartAbbreviationsStashedValue });
            drawPartNamesOptionNeedsReset = false;
        }

        // ── Music Braille sample hooks (see the "Music Braille" section at the bottom of this file) ──
        // Selecting one of the Music Braille demo samples switches the braille display on automatically --
        //   they exist to showcase braille -- and expands the collapsed "Music Braille options" section so
        //   its settings are visible. The previous display state is restored when a non-braille sample is
        //   selected again. (Setting .checked here doesn't fire onchange; renderBraille() runs anyway after
        //   load and reads the updated checkboxes.)
        if (!isCustom && str.includes("test_Braille_")) {
            if (!brailleSampleNeedsReset) { // only stash once for a row of consecutive braille samples
                brailleSampleStashedShowBraille = brailleEnabled();
                brailleSampleNeedsReset = true;
            }
            if (brailleShowCheckbox) {
                brailleShowCheckbox.checked = true;
            }
            if (brailleOptionsDetails) {
                brailleOptionsDetails.open = true;
            }
            updateClassicalScoreVisibility(); // braille on: an unchecked "Show classical score" takes effect again
        } else if (brailleSampleNeedsReset) {
            if (brailleShowCheckbox) {
                brailleShowCheckbox.checked = brailleSampleStashedShowBraille;
            }
            brailleSampleNeedsReset = false;
            updateClassicalScoreVisibility(); // braille restored to off forces the classical score back on
        }
        // test_Braille_Facsimile_option.musicxml is designed to demonstrate facsimile braille: turn facsimile
        //   output on and let the system line breaks follow the MusicXML, so the braille mirrors the intended
        //   print layout. Stash the prior facsimile checkbox + newSystem settings, restored when another score
        //   is selected.
        if (!isCustom && str.includes("test_Braille_Facsimile_option")) {
            brailleFacsimileSampleStashedCheckbox = !!(brailleFacsimileCheckbox && brailleFacsimileCheckbox.checked);
            brailleFacsimileSampleStashedSystemBreaks = openSheetMusicDisplay.EngravingRules.NewSystemAtXMLNewSystemAttribute;
            if (brailleFacsimileCheckbox) {
                brailleFacsimileCheckbox.checked = true;
            }
            openSheetMusicDisplay.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
            brailleFacsimileSampleNeedsReset = true;
        } else if (brailleFacsimileSampleNeedsReset) {
            if (brailleFacsimileCheckbox) {
                brailleFacsimileCheckbox.checked = brailleFacsimileSampleStashedCheckbox;
            }
            openSheetMusicDisplay.EngravingRules.NewSystemAtXMLNewSystemAttribute = brailleFacsimileSampleStashedSystemBreaks;
            brailleFacsimileSampleNeedsReset = false;
        }
    }

    function errorLoadingOrRenderingSheet(e, loadingOrRenderingString) {
        var errorString = "Error " + loadingOrRenderingString + " sheet: " + e;
        // Always giving a StackTrace might give us more and better error reports.
        // TODO for a release, StackTrace control could be reenabled
        errorString += "\n" + "StackTrace: \n" + e.stack;
        // }
        console.warn(errorString);
    }

    function onLoadingEnd(isCustom) {
        // Remove option from select
        if (!isCustom && custom.parentElement === selectSample) {
            selectSample.removeChild(custom);
        }
        // Enable controls again
        enable();
    }

    function logCanvasSize() {
        for (const zoomDiv of zoomDivs) {
            if (zoomDiv) {
                zoomDiv.innerHTML = Math.floor(zoom * 100.0) + "%";
            }
        }
    }

    function scale() {
        disable();
        window.setTimeout(function () {
            openSheetMusicDisplay.Zoom = zoom;
            renderAndScrollBack();
            enable();
        }, 0);
    }

    function rerender() {
        disable();
        window.setTimeout(function () {
            if (openSheetMusicDisplay.IsReadyToRender()) {
                renderAndScrollBack();
            } else {
                console.log("[OSMD demo] Loses context!"); // TODO not sure that this message is reasonable, renders fine anyways. maybe vexflow context lost?
                selectSampleOnChange(); // reload sample e.g. after osmd.clear()
            }
            enable();
        }, 0);
    }

    function error(errString) {
        if (!errString) {
            error_tr.style.display = "none";
        } else {
            console.log("[OSMD demo] error: " + errString)
            err.textContent = errString;
            error_tr.style.display = "";
            canvas.width = canvas.height = 0;
            enable();
        }
    }

    // Enable/Disable Controls
    function disable() {
        document.body.style.opacity = 0.3;
        setDisabledForControls("disabled");
    }

    function enable() {
        document.body.style.opacity = 1;
        setDisabledForControls("");
        logCanvasSize();
    }

    function setDisabledForControls(disabledValue) {
        if (selectSample) {
            selectSample.disabled = disabledValue;
        }
        for (const zoomIn of zoomIns) {
            if (zoomIn) {
                zoomIn.disabled = disabledValue;
            }
        }
        for (const zoomOut of zoomOuts) {
            if (zoomOut) {
                zoomOut.disabled = disabledValue;
            }
        }
    }

    /**
     * Renders an SVG element to a JPEG data URL using the browser's native SVG renderer (e.g. for createPDF()).
     * This correctly handles unicode characters, 8-digit hex colors with alpha (#RRGGBBAA),
     * and all SVG features that the browser supports.
     * @param svgElement the SVG DOM element to render
     * @param scale resolution multiplier (default 1, use 2 for higher DPI)
     * @param jpegQuality JPEG compression quality, 0.0 to 1.0 (default 0.8)
     * @returns {Promise<string>} JPEG data URL
     */
    function svgElementToDataUrl(svgElement, scale, jpegQuality) {
        if (scale === undefined) {
            scale = 2;
            // scale 2 and jpegQuality 0.9 is a good balance between sharpness and file size.
            //   File size is still smaller than before the jpeg change.
            //   at scale 1, especially curved objects like clefs and braces look bad when zooming in a lot.
        }
        if (jpegQuality === undefined) {
            jpegQuality = 0.9;
        }
        return new Promise(function(resolve, reject) {
            var clone = svgElement.cloneNode(true);
            if (!clone.getAttribute('xmlns')) {
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            if (!clone.getAttribute('xmlns:xlink')) {
                clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            }

            var width = svgElement.clientWidth || svgElement.getBoundingClientRect().width;
            var height = svgElement.clientHeight || svgElement.getBoundingClientRect().height;
            clone.setAttribute('width', width);
            clone.setAttribute('height', height);

            var svgData = new XMLSerializer().serializeToString(clone);
            var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            var url = URL.createObjectURL(svgBlob);

            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = width * scale;
                canvas.height = height * scale;
                var ctx = canvas.getContext('2d');
                // Fill white background so transparent elements stay invisible against white
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', jpegQuality));
            };
            img.onerror = function(e) {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to render SVG to image'));
            };
            img.src = url;
        });
    }

    /**
     * Creates a PDF of the currently rendered MusicXML.
     * By default, uses image-based export which correctly handles unicode characters
     * (Vietnamese, Chinese, etc.) and transparency (8-digit hex colors like #RRGGBBAA).
     * @param pdfName if no name is given, the composer and title of the piece will be used
     * @param scale resolution multiplier for image export (default 1). Higher values produce
     *   sharper output but larger files. Use 2 for high-DPI/print quality.
     * @param exportMode "image" (default) renders via browser's native SVG renderer for best
     *   compatibility. "svg" uses svg2pdf.js for vector output (requires svg2pdf.js, may have
     *   rendering issues with unicode and transparency).
     */
    async function createPdf(pdfName, scale, exportMode) {
        // If an incremental render is mid-flight, finish it first: PDF export reads the backend SVG, which
        //   otherwise only holds the batches scrolled into view so far. No-op for a normal/complete render.
        openSheetMusicDisplay.renderRemaining();
        if (scale === undefined) {
            scale = 2;
        }
        if (exportMode === undefined) {
            exportMode = "image";
        }
        if (openSheetMusicDisplay.backendType !== BackendType.SVG) {
            console.log("[OSMD] createPdf(): Warning: createPdf is only supported for SVG backend for now, not for Canvas." +
                " Please use osmd.setOptions({backendType: SVG}).");
            return;
        }

        if (pdfName === undefined) {
            pdfName = openSheetMusicDisplay.sheet.FullNameString + ".pdf";
        }

        const backends = openSheetMusicDisplay.drawer.Backends;
        let svgElement = backends[0].getSvgElement();

        let pageWidth = 210;
        let pageHeight = 297;
        const engravingRulesPageFormat = openSheetMusicDisplay.rules.PageFormat;
        if (engravingRulesPageFormat && !engravingRulesPageFormat.IsUndefined) {
            pageWidth = engravingRulesPageFormat.width;
            pageHeight = engravingRulesPageFormat.height;
        } else {
            pageHeight = pageWidth * svgElement.clientHeight / svgElement.clientWidth;
        }

        const orientation = pageHeight > pageWidth ? "p" : "l";
        const pdf = new jsPDF.jsPDF({
            orientation: orientation,
            unit: "mm",
            format: [pageWidth, pageHeight]
        });
        if (exportMode === "image") {
            // Image-based export: uses the browser's native SVG renderer, which correctly
            // handles unicode, 8-digit hex alpha colors, and all CSS/SVG features.
            for (let idx = 0; idx < backends.length; idx++) {
                if (idx > 0) {
                    pdf.addPage();
                }
                svgElement = backends[idx].getSvgElement();
                const imageDataUrl = await svgElementToDataUrl(svgElement, scale);
                pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
            }
        } else {
            // SVG-based export (original approach, requires svg2pdf.js).
            // Note: svg2pdf.js may not correctly handle unicode or 8-digit hex colors.
            if (!pdf.svg && !svg2pdf) {
                console.log("[OSMD] createPdf(): svg2pdf.js missing, necessary for SVG export mode.");
                return;
            }
            for (let idx = 0; idx < backends.length; idx++) {
                if (idx > 0) {
                    pdf.addPage();
                }
                svgElement = backends[idx].getSvgElement();
                await pdf.svg(svgElement, {
                    x: 0,
                    y: 0,
                    width: pageWidth,
                    height: pageHeight,
                });
            }
        }

        pdf.save(pdfName); // save/download the created pdf
        // pdf.output("pdfobjectnewwindow", {filename: "osmd_createPDF.pdf"}); // open PDF in new tab/window
    }

    // Load a local MusicXML file (a File object) into OSMD. Shared by the drag&drop handler and the
    //   "Open file..." button next to the sample select (the keyboard/screen-reader friendly path).
    function openLocalFile(file) {
        var filename = file.name.toLowerCase();
        var isXmlFile = filename.indexOf(".xml") > 0 || filename.indexOf(".musicxml") > 0;
        var isMxlFile = filename.indexOf(".mxl") > 0;
        if (!isXmlFile && !isMxlFile) {
            alert("No valid .xml/.mxl/.musicxml file!");
            return;
        }
        if (selectSample) {
            // Add "Custom" entry to the sample select and select it (removed again when a sample loads)
            selectSample.appendChild(custom);
            custom.selected = "selected";
        }
        var reader = new FileReader();
        reader.onload = function (res) {
            selectSampleOnChange(res.target.result); // a string argument is loaded as raw file content, not as URL
        };
        if (isXmlFile) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file); // .mxl is zipped -- osmd.load() detects and unzips binary strings
        }
    }

    // ═══════════════════════════ Music Braille (optional demo feature) ═══════════════════════════
    // Everything braille-related in the demo lives below (plus the small hooks marked "braille"/"Music
    //   Braille" in init(), selectSampleOnChange() and setSampleSpecificOptions()) -- non-braille usage
    //   of the demo can ignore this section entirely. The braille score is only converted and shown when
    //   the user enables "Show Music Braille score (below classical)" in the collapsed "Music Braille
    //   options" section at the bottom of the sidebar, selects one of the "Music Braille Test" samples,
    //   or opens the demo with ?braille=1. See src/Plugins/Braille/README.md for the braille module.

    /** Whether the Music Braille score display is enabled ("Show Music Braille score" checkbox). */
    function brailleEnabled() {
        return !!(brailleShowCheckbox && brailleShowCheckbox.checked);
    }

    // ── "Show classical score (above braille)" option ────────────────────────────────────────
    // Only effective while the braille score is shown (braille off means classical on, so the demo
    //   can never end up displaying nothing). When unchecked, the visual (non-braille) score is
    //   hidden and newly loaded scores are not rendered at all: osmd.load() alone builds the data
    //   model the braille conversion reads, skipping the whole graphical layout step -- the expensive
    //   part for large scores. Braille facsimile mode is the exception: it mirrors the rendered
    //   layout (GraphicSheet), so it forces a render; the classical score then simply stays hidden.
    function classicalScoreEnabled() {
        if (!brailleEnabled()) {
            return true; // hiding the classical score is a braille display option
        }
        return !brailleShowClassicalCheckbox || brailleShowClassicalCheckbox.checked;
    }

    // Hide/show the classical score via a body class (see demo.css). visibility + height:0 instead
    //   of display:none, so the container keeps its width and OSMD can still render into it.
    function updateClassicalScoreVisibility() {
        if (classicalScoreEnabled()) {
            document.body.classList.remove("classical-score-hidden");
        } else {
            document.body.classList.add("classical-score-hidden");
        }
    }

    // Render the current sheet if it was loaded without rendering (classical score disabled).
    //   Needed when the user re-enables the classical score or enables facsimile mode.
    function ensureSheetRendered() {
        if (!sheetRendered && openSheetMusicDisplay && openSheetMusicDisplay.Sheet) {
            renderAndScrollBack();
        }
    }

    // (Re)convert the currently loaded sheet to braille and repopulate the braille container.
    //   Called once after each load, and again whenever a braille UI option changes (e.g. the lyrics
    //   checkbox) -- so toggling an option re-renders just the braille, no score reload needed.
    //   While the braille display is disabled (the default), this only clears the container.
    function renderBraille() {
        if (!brailleContainer) {
            return;
        }
        if (!brailleEnabled()) {
            // braille display off: leave no stale output (or its headings) in the page/accessibility tree
            brailleContainer.innerHTML = "";
            return;
        }
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
            return; // nothing loaded yet
        }
        const converter = new BrailleConverter();
        // ── Braille output settings ──────────────────────────────────────
        // brailleFormat: "facsimile" mirrors the print layout (adds clefs, ottava brackets, system line breaks)
        //   by reading the rendered GraphicSheet; "nonfacsimile" is standard braille music (default). Facsimile
        //   follows OSMD's own system breaks, which usually look better than the MusicXML's. To make the breaks
        //   follow the MusicXML instead, set EngravingRules.NewSystemAtXMLNewSystemAttribute = true yourself.
        const brailleFormat = (brailleFacsimileCheckbox && brailleFacsimileCheckbox.checked) ? "facsimile" : "nonfacsimile"; // "Enable facsimile mode" UI toggle (off by default)
        const barOverBarFormat = !!(brailleBarOverBarCheckbox && brailleBarOverBarCheckbox.checked); // "Bar-over-bar (keyboard)" UI toggle: vertically aligned measures (off by default)
        const ensembleFormat = !!(brailleEnsembleCheckbox && brailleEnsembleCheckbox.checked); // "Ensemble" UI toggle: bar-over-bar with instrument abbreviations (off by default)
        const lyricsFormat = !!(brailleLyricsCheckbox && brailleLyricsCheckbox.checked); // "Enable braille lyrics" UI toggle (off by default)
        // Note: bar-over-bar and ensemble require monospace font for visual alignment.
        // Lyrics uses the same monospace formatting for consistent appearance.
        const needsMonospace = barOverBarFormat || ensembleFormat || lyricsFormat;
        // ────────────────────────────────────────────────────────────────────
        const output = converter.convert(openSheetMusicDisplay.Sheet, {
            // staffIndex: 0, // uncomment to render only one staff (e.g. RH of piano)
            //   multiStaff is auto-detected: scores with >1 staff render all staves with hand signs
            barOverBar: barOverBarFormat,
            ensemble: ensembleFormat,
            lyrics: lyricsFormat,
            format: brailleFormat,
            graphicSheet: openSheetMusicDisplay.GraphicSheet, // only needed for facsimile option (format: "facsimile")
        });
        brailleContainer.innerHTML = "";
        // Real heading elements so screen readers list them under Headings (e.g. NVDA Elements List).
        //   <h2> makes the score the page's single top-level output landmark -- with only the OSMD title
        //   at <h1> and everything else at <h3>, a braille user can jump straight here. The debug section's
        //   "Braille Debug Output" heading (in createBrailleDebugTable) is the <h3> that nests under this.
        var scoreHeading = document.createElement("h2");
        scoreHeading.textContent = "Music Braille Score";
        scoreHeading.style.fontFamily = "sans-serif";
        scoreHeading.style.fontSize = "20px";
        scoreHeading.style.margin = "0";
        scoreHeading.style.padding = "12px 8px 0 8px"; // align left edge with the braille text below (8px), gap comes from its own top padding
        brailleContainer.appendChild(scoreHeading);
        var brailleTextDiv = document.createElement("div");
        brailleTextDiv.style.fontSize = "24px";
        brailleTextDiv.style.fontFamily = needsMonospace
            ? "'Consolas', 'Courier New', 'DejaVu Sans Mono', monospace" : "serif";
        brailleTextDiv.style.padding = "12px 8px";
        brailleTextDiv.style.whiteSpace = needsMonospace ? "pre" : "pre-line";
        if (needsMonospace) {
            brailleTextDiv.style.fontFeatureSettings = "'liga' 0"; // disable ligatures for uniform width
        }
        brailleTextDiv.textContent = output.text;
        brailleContainer.appendChild(brailleTextDiv);
        brailleContainer.appendChild(createBrailleDebugTable(output, brailleFormat));
        window.brailleDebug = {
            output: output,
            text: output.text,
            debugEntries: output.debugEntries
        };
    }

    /**
     * Creates an HTML table showing braille debug/translation information.
     * Each row shows: index, braille character, meaning, and measure number.
     * Barline rows are highlighted for easy visual grouping by measure.
     */
    function createBrailleDebugTable(output, format) {
        var container = document.createElement("div");
        container.style.padding = "8px";
        container.style.marginTop = "8px";

        var heading = document.createElement("h3"); // h3 nests under the "Music Braille Score" <h2> without skipping a level
        heading.textContent = "Braille Debug Output";
        heading.style.margin = "0 0 2px 0";
        heading.style.fontFamily = "sans-serif";
        heading.style.fontSize = "1em"; // keep its prior <h4> size -- heading level is semantic, not visual
        container.appendChild(heading);

        var modeLabel = document.createElement("div");
        modeLabel.textContent = (format || "nonfacsimile") + " mode";
        modeLabel.style.fontFamily = "sans-serif";
        modeLabel.style.fontSize = "12px";
        modeLabel.style.fontStyle = "italic";
        modeLabel.style.color = "#888";
        modeLabel.style.marginBottom = "8px";
        container.appendChild(modeLabel);

        var table = document.createElement("table");
        table.style.borderCollapse = "collapse";
        table.style.fontFamily = "monospace";
        table.style.fontSize = "13px";
        table.style.width = "auto";

        // Header row
        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");
        var headers = ["#", "Braille", "Meaning", "Measure"];
        for (var h = 0; h < headers.length; h++) {
            var th = document.createElement("th");
            th.textContent = headers[h];
            th.style.padding = "4px 12px";
            th.style.borderBottom = "2px solid #333";
            th.style.textAlign = "left";
            th.style.fontFamily = "sans-serif";
            th.style.fontSize = "12px";
            th.style.color = "#555";
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body rows
        var tbody = document.createElement("tbody");
        var entries = output.debugEntries;
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var isBarline = entry.meaning === "barline";
            var tr = document.createElement("tr");

            if (isBarline) {
                tr.style.backgroundColor = "#e8f0fe";
                tr.style.fontWeight = "bold";
                tr.style.color = "#1a56db";
            } else if (i % 2 === 0) {
                tr.style.backgroundColor = "#fafafa";
            }

            // Index column
            var tdIndex = document.createElement("td");
            tdIndex.textContent = i;
            tdIndex.style.padding = "3px 12px";
            tdIndex.style.borderBottom = "1px solid #e0e0e0";
            tdIndex.style.color = "#999";
            tr.appendChild(tdIndex);

            // Braille character column
            var tdBraille = document.createElement("td");
            tdBraille.textContent = entry.braille;
            tdBraille.style.padding = "3px 12px";
            tdBraille.style.borderBottom = "1px solid #e0e0e0";
            tdBraille.style.fontSize = "18px";
            tr.appendChild(tdBraille);

            // Meaning column
            var tdMeaning = document.createElement("td");
            tdMeaning.textContent = entry.meaning;
            tdMeaning.style.padding = "3px 12px";
            tdMeaning.style.borderBottom = "1px solid #e0e0e0";
            tr.appendChild(tdMeaning);

            // Measure number column
            var tdMeasure = document.createElement("td");
            tdMeasure.textContent = entry.measureNumber;
            tdMeasure.style.padding = "3px 12px";
            tdMeasure.style.borderBottom = "1px solid #e0e0e0";
            tdMeasure.style.textAlign = "center";
            tr.appendChild(tdMeasure);

            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    // Register events: load, drag&drop
    window.addEventListener("load", function () {
        init();
    });
    window.addEventListener("dragenter", function (event) {
        event.preventDefault();
        disable();
    });
    window.addEventListener("dragover", function (event) {
        event.preventDefault();
    });
    window.addEventListener("dragleave", function (event) {
        enable();
    });
    window.addEventListener("drop", function (event) {
        event.preventDefault();
        if (!event.dataTransfer || !event.dataTransfer.files || event.dataTransfer.files.length === 0) {
            return;
        }
        openLocalFile(event.dataTransfer.files[0]);
    });
}());
