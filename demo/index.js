import { OpenSheetMusicDisplay } from '../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay';
import { BackendType } from '../src/OpenSheetMusicDisplay/OSMDOptions';
import { countLedgerLineNotesForTransposition } from '../src/OpenSheetMusicDisplay/ledgerLineTranspositionCount';
import * as jsPDF  from '../node_modules/jspdf/dist/jspdf.es.min';
import * as svg2pdf from '../node_modules/svg2pdf.js/dist/svg2pdf.umd.min';
import { TransposeCalculator } from '../src/Plugins/Transpose/TransposeCalculator';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';

/*jslint browser:true */
(function () {
    "use strict";
    var openSheetMusicDisplay;
    var sampleFolder = "",
        samples = {
            // "Summer Time": "summertime.musicxml",
            "Kuhlau Sonatina": "1878-2.musicxml",
            "Czerny Etude no 1 op 299": "819.musicxml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "Fingerings are oddly positioned": "1168-3.musicxml",
            "Chords but the chords are weirdly positioned": "836.musicxml",
            "Rests in weird places": "2239-2.musicxml",
            "Lead Sheet with chords": "1181.musicxml",
            "Test 8va": "1851-3.musicxml",
            "Sample 2": "1346 2.musicxml",
            "Sample": "1346.musicxml",
            "Beethoven, L.v. - An die ferne Geliebte": "Beethoven_AnDieFerneGeliebte.xml",
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
        drawPartAbbreviationsOnFirstSystemCheckbox,
        showCursorBtn,
        hideCursorBtn,
        backendSelect,
        backendSelectDiv,
        debugReRenderBtn,
        debugClearBtn,
        selectPageSizes,
        printPdfBtns,
        darkModeBtn,
        exportMidiBtn,
        playMidiBtn,
        transpose,
        transposeBtn,
        toggleSelectionRangeBtn,
        versionDiv,
        measureFromInput,
        measureToInput,
        applyMeasureRangeBtn,
        resetMeasureRangeBtn,
        measureRangeStatus,
        measureRangeText,
        blurVoiceInput,
        blurOpacityInput,
        applyBlurBtn,
        resetOpacityBtn,
        tempoBPMInput,
        updateTempoBtn,
        logTempoBtn,
        tempoStatus,
        tempoStatusText,
        staffIndexInput,
        staffOpacityInput,
        blurStaffBtn,
        restoreStaffBtn,
        blurStaff0Btn,
        blurStaff1Btn,
        restoreAllStavesBtn;
    var isSelectionRangeHidden = false;
    
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
    var drawPartAbbreviationsOnFirstSystemStashedValue = false;
    var drawPartNamesOptionNeedsReset = false;
    var pageBreaksOptionStashedValue = false;
    var pageBreaksOptionNeedsReset = false;
    var systemBreaksOptionStashedValue = false; // reset handled by pageBreaksOptionNeedsReset

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
        
        // set the backendSelect debug controls dropdown menu selected item
        //console.log("true: " + backendSelect && backendType.toLowerCase && backendType.toLowerCase() === "canvas");
        // TODO somehow backendSelect becomes undefined here:
        /*if (backendSelect && backendType.toLowerCase && backendType.toLowerCase() === "canvas") {
            console.log("here1");
            for (var i=0; i<backendSelect.options.length; i++) {
                if (backendSelect.options[i].value.toLowerCase() === "canvas") {
                    backendSelect.selectedIndex = i;
                }
            }
            backendSelect.value = "Canvas";
        }*/

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
        drawPartAbbreviationsOnFirstSystemCheckbox = document.getElementById("draw-part-abbr-first-system-checkbox");
        showCursorBtn = document.getElementById("show-cursor-btn");
        hideCursorBtn = document.getElementById("hide-cursor-btn");
        backendSelect = document.getElementById("backend-select");
        backendSelectDiv = document.getElementById("backend-select-div");
        debugReRenderBtn = document.getElementById("debug-re-render-btn");
        debugClearBtn = document.getElementById("debug-clear-btn");
        selectPageSizes = [];
        selectPageSizes.push(document.getElementById("selectPageSize"));
        selectPageSizes.push(document.getElementById("selectPageSize-optional"));
        printPdfBtns = [];
        printPdfBtns.push(document.getElementById("print-pdf-btn"));
        printPdfBtns.push(document.getElementById("print-pdf-btn-optional"));
        darkModeBtn = document.getElementById("dark-mode-btn");
        toggleSelectionRangeBtn = document.getElementById("toggle-selection-range-btn");
        exportMidiBtn = document.getElementById("export-midi-btn");
        playMidiBtn = document.getElementById("play-midi-btn");
        transpose = document.getElementById('transpose');
        transposeBtn = document.getElementById('transpose-btn');
        versionDiv = document.getElementById('versionDiv');
        measureFromInput = document.getElementById('measureFrom');
        measureToInput = document.getElementById('measureTo');
        applyMeasureRangeBtn = document.getElementById('apply-measure-range-btn');
        resetMeasureRangeBtn = document.getElementById('reset-measure-range-btn');
        measureRangeStatus = document.getElementById('measure-range-status');
        measureRangeText = document.getElementById('measure-range-text');
        zoomControlsButtons = document.getElementById('zoomControlsButtons');
        blurVoiceInput = document.getElementById('blurVoice');
        blurOpacityInput = document.getElementById('blurOpacity');
        applyBlurBtn = document.getElementById('apply-blur-btn');
        resetOpacityBtn = document.getElementById('reset-opacity-btn');
        tempoBPMInput = document.getElementById('tempoBPM');
        updateTempoBtn = document.getElementById('update-tempo-btn');
        logTempoBtn = document.getElementById('log-tempo-btn');
        tempoStatus = document.getElementById('tempo-status');
        tempoStatusText = document.getElementById('tempo-status-text');
        staffIndexInput = document.getElementById('staffIndex');
        staffOpacityInput = document.getElementById('staffOpacity');
        blurStaffBtn = document.getElementById('blur-staff-btn');
        restoreStaffBtn = document.getElementById('restore-staff-btn');
        blurStaff0Btn = document.getElementById('blur-staff-0-btn');
        blurStaff1Btn = document.getElementById('blur-staff-1-btn');
        restoreAllStavesBtn = document.getElementById('restore-all-staves-btn');

        // Create an additional "Focus Voice" button (blur all except selected voice) if not present
        var focusVoiceBtn = document.getElementById('focus-voice-btn');
        if (!focusVoiceBtn && applyBlurBtn && applyBlurBtn.parentElement) {
            focusVoiceBtn = document.createElement('div');
            focusVoiceBtn.id = 'focus-voice-btn';
            focusVoiceBtn.className = 'ui button';
            focusVoiceBtn.textContent = 'Focus Voice';
            applyBlurBtn.parentElement.appendChild(focusVoiceBtn);
        }

        //var defaultDisplayVisibleValue = "block"; // TODO in some browsers flow could be the better/default value
        var defaultVisibilityValue = "visible";
        showDebugControls = paramDebugControls !== '0';
        if (showDebugControls) {
            var elementsToEnable = [
                selectSample, selectBounding, selectPageSizes[0], backendSelect, backendSelectDiv, divControls
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
        if (window.outerWidth < 768) {
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
            slideButton.onclick=function slideButtonClicked(){
                var slideContainer = document.getElementById("slideContainer");
                slideContainer.addEventListener("animationend", function(e){
                    e.preventDefault();
    
                    if(slideContainer.style.animationName == "slide-left"){
                        divControls.style.display = "block";
                    }
                });
    
                if(divControls.style.display == "block"){
                    divControls.style.display = "flex";
                    slideContainer.style.animation = "0.7s slide-right";
                    slideContainer.style.animationFillMode = "forwards"
                    slideButton.style.background = "url('resources/arrow-left-s-line.svg') 50% no-repeat var(--theme-color-light)"
                    return;
                }
                slideContainer.style.animation = "0.7s slide-left"
                slideContainer.style.animationFillMode = "forwards"
                slideButton.style.background = "url('resources/arrow-right-s-line.svg') 50% no-repeat var(--theme-color-light)"
            }
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
        if (!toggleSelectionRangeBtn && darkModeBtn && darkModeBtn.parentElement) {
            toggleSelectionRangeBtn = document.createElement("div");
            toggleSelectionRangeBtn.id = "toggle-selection-range-btn";
            toggleSelectionRangeBtn.className = "ui button";
            darkModeBtn.parentElement.appendChild(toggleSelectionRangeBtn);
        }
        if (toggleSelectionRangeBtn) {
            updateSelectionRangeToggleButtonLabel();
            toggleSelectionRangeBtn.onclick = function () {
                setSelectionRangeHidden(!isSelectionRangeHidden, true);
            };
        }

        if (exportMidiBtn) {
            exportMidiBtn.onclick = function() {
                if (openSheetMusicDisplay && openSheetMusicDisplay.Sheet) {
                    console.log("[OSMD] Exporting MIDI...");
                    openSheetMusicDisplay.exportMIDIDownload();
                    console.log("[OSMD] MIDI export completed.");
                } else {
                    console.log("[OSMD] No sheet loaded to export.");
                }
            }
        }

        // MIDI Playback using SpessaSynth (single synth/sequencer instance)
        var midiPlayer = {
            audioContext: null,
            synth: null,
            sequencer: null,
            isPlaying: false,
            isInitialized: false
        };

        var WORKLET_PATH = "./resources/spessasynth_processor.min.js";
        var SOUNDFONT_PATH = "./resources/GeneralUserGS.sf3";

        // Initialize SpessaSynth once on first play
        async function initSpessaSynth() {
            if (midiPlayer.isInitialized) return;

            console.log("[OSMD] Initializing SpessaSynth...");

            // Create audio context and worklet
            midiPlayer.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await midiPlayer.audioContext.audioWorklet.addModule(WORKLET_PATH);

            // Create synth
            midiPlayer.synth = new WorkletSynthesizer(midiPlayer.audioContext);
            midiPlayer.synth.connect(midiPlayer.audioContext.destination);

            // Load soundfont
            var sfResponse = await fetch(SOUNDFONT_PATH);
            if (!sfResponse.ok) throw new Error("Failed to load SoundFont");
            var sfData = await sfResponse.arrayBuffer();
            await midiPlayer.synth.soundBankManager.addSoundBank(sfData, "main");

            // Create sequencer
            midiPlayer.sequencer = new Sequencer(midiPlayer.synth);
            midiPlayer.sequencer.loopCount = 0;

            // Handle song end
            midiPlayer.sequencer.eventHandler.addEvent('songEnded', 'osmd-demo', function() {
                midiPlayer.isPlaying = false;
                if (playMidiBtn) playMidiBtn.textContent = "Play MIDI";
                console.log("[OSMD] Playback finished.");
            });

            midiPlayer.isInitialized = true;
            console.log("[OSMD] SpessaSynth ready!");
        }

        if (playMidiBtn) {
            playMidiBtn.onclick = async function() {
                if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
                    console.log("[OSMD] No sheet loaded.");
                    return;
                }

                if (midiPlayer.isPlaying) {
                    midiPlayer.sequencer.pause();
                    midiPlayer.isPlaying = false;
                    playMidiBtn.textContent = "Play MIDI";
                } else {
                    playMidiBtn.textContent = "Loading...";
                    try {
                        if (!midiPlayer.isInitialized) await initSpessaSynth();
                        await midiPlayer.audioContext.resume();

                        var midiData = openSheetMusicDisplay.exportMIDI();
                        if (!midiData) throw new Error("Failed to export MIDI");

                        var midiBuffer = midiData.buffer.slice(midiData.byteOffset, midiData.byteOffset + midiData.byteLength);
                        midiPlayer.sequencer.loadNewSongList([{ binary: midiBuffer }]);
                        midiPlayer.sequencer.currentTime = 0;
                        midiPlayer.sequencer.play();
                        midiPlayer.isPlaying = true;
                        playMidiBtn.textContent = "Stop MIDI";
                    } catch (e) {
                        console.error("[OSMD] Playback error:", e);
                        alert("MIDI playback failed: " + e.message);
                        playMidiBtn.textContent = "Play MIDI";
                    }
                }
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
            rangeSelection: {
                enabled: true,
                options: {
                    enabled: true,
                    lineColor: "rgba(47, 169, 224, 0.95)",
                    fillColor: "rgba(47, 169, 224, 0.25)",
                    outsideMaskColor: "rgba(0, 0, 0, 0.20)",
                    lineWidthPx: 12,
                    hideSelectionRange: isSelectionRangeHidden,
                    overlayZIndex: 4,
                    snapToNotes: true,
                },
                callbacks: {
                    onChange: function (payload) {
                        if (!payload) {
                            return;
                        }
                    },
                    onLoopRequest: function (payload) {
                    },
                    onClearRequest: function (payload) {
                    },
                    onControlsRender: function (container, payload) {
                var makeIconButton = function (icon, title, onClick) {
                    var button = document.createElement("button");
                    button.type = "button";
                    button.textContent = icon;
                    button.title = title;
                    button.style.border = "none";
                    button.style.borderRadius = "8px";
                    button.style.width = "28px";
                    button.style.height = "28px";
                    button.style.padding = "0";
                    button.style.backgroundColor = "rgba(255, 255, 255, 0.96)";
                    button.style.color = "#1d1d1d";
                    button.style.fontSize = "14px";
                    button.style.lineHeight = "1";
                    button.style.cursor = "pointer";
                    button.style.boxShadow = "0 1px 4px rgba(0, 0, 0, 0.25)";
                    button.onclick = onClick;
                    return button;
                };
                container.appendChild(makeIconButton("↻", "Loop Section", function (event) {
                    event.stopPropagation();
                    if (openSheetMusicDisplay?.rangeSelection?.callbacks?.onLoopRequest) {
                        openSheetMusicDisplay.rangeSelection.callbacks.onLoopRequest(payload);
                    }
                }));
                container.appendChild(makeIconButton("✕", "Clear Selection", function (event) {
                    event.stopPropagation();
                    if (openSheetMusicDisplay?.rangeSelection?.callbacks?.onClearRequest) {
                        openSheetMusicDisplay.rangeSelection.callbacks.onClearRequest(payload);
                    }
                    openSheetMusicDisplay?.clearRangeSelection(false);
                }));
                    },
                },
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
        if (drawPartAbbreviationsOnFirstSystemCheckbox) {
            drawPartAbbreviationsOnFirstSystemCheckbox.checked =
                !!openSheetMusicDisplay.EngravingRules.RenderPartAbbreviationsOnFirstSystem;
            drawPartAbbreviationsOnFirstSystemCheckbox.onchange = function () {
                openSheetMusicDisplay.setOptions({
                    drawPartAbbreviationsOnFirstSystem: drawPartAbbreviationsOnFirstSystemCheckbox.checked
                });
                if (openSheetMusicDisplay.graphic) {
                    openSheetMusicDisplay.renderAndScrollBack();
                }
            };
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

        backendSelect.addEventListener("change", function (e) {
            var value = e.target.value;
            var createNewOsmd = true;

            if (createNewOsmd) {
                // clears the canvas element
                canvas.innerHTML = "";
                //openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, { backend: value }); // resets EngravingRules
                openSheetMusicDisplay.setOptions({backend: value});
                openSheetMusicDisplay.setLogLevel('info'); // set this to 'debug' if you want to get more detailed control flow information
                if (openSheetMusicDisplay.graphic) {
                    openSheetMusicDisplay.renderAndScrollBack();
                }
            } else {
                // alternative, doesn't work yet, see setOptions():
                openSheetMusicDisplay.setOptions({ backend: value });
            }
            console.log("[OSMD] selectSampleOnChange addEventListener change");
            // selectSampleOnChange();
        });
        if(transposeBtn && transpose){
            transposeBtn.onclick = function(){
                var transposeValue = parseInt(transpose.value);
                openSheetMusicDisplay.Sheet.Transpose = transposeValue;
                openSheetMusicDisplay.updateGraphic();
                rerender();
            }
        }

        if(applyMeasureRangeBtn && measureFromInput && measureToInput){
            applyMeasureRangeBtn.onclick = function(){
                var fromMeasure = parseInt(measureFromInput.value) || 1;
                var toMeasure = parseInt(measureToInput.value) || Number.MAX_SAFE_INTEGER;
                
                if(fromMeasure > toMeasure){
                    console.log("[OSMD] Warning: From measure cannot be greater than To measure. Swapping values.");
                    var temp = fromMeasure;
                    fromMeasure = toMeasure;
                    toMeasure = temp;
                }
                
                console.log("Applying measure range: [" + fromMeasure + ", " + (toMeasure === Number.MAX_SAFE_INTEGER ? "All" : toMeasure) + "]");
                openSheetMusicDisplay.setOptions({
                    drawFromMeasureNumber: fromMeasure,
                    drawUpToMeasureNumber: toMeasure === Number.MAX_SAFE_INTEGER ? undefined : toMeasure
                });
                updateMeasureRangeStatus(fromMeasure, toMeasure);
                renderAndScrollBack();
            }
        }

        if(resetMeasureRangeBtn){
            resetMeasureRangeBtn.onclick = function(){
                console.log("Resetting to show all measures");
                measureFromInput.value = "";
                measureToInput.value = "";
                openSheetMusicDisplay.setOptions({
                    drawFromMeasureNumber: 1,
                    drawUpToMeasureNumber: undefined
                });
                updateMeasureRangeStatus(1, Number.MAX_SAFE_INTEGER);
                renderAndScrollBack();
            }
        }

        if (applyBlurBtn) {
            applyBlurBtn.onclick = function () {
                var voiceIndex = null;
                var opacity = 0.3;

                if (blurVoiceInput.value) {
                    voiceIndex = parseInt(blurVoiceInput.value);
                    if (isNaN(voiceIndex)) {
                        console.log("Invalid voice index");
                        return;
                    }
                } else {
                    console.log("Please enter a voice index");
                    return;
                }

                if (blurOpacityInput.value) {
                    opacity = parseFloat(blurOpacityInput.value);
                }

                // Convert 0-indexed input (0, 1, 2...) to 1-indexed voice IDs (1, 2, 3...)
                var actualVoiceId = voiceIndex + 1;
                console.log("Applying blur - Voice Index: " + voiceIndex + ", Voice ID: " + actualVoiceId + ", Opacity: " + opacity);
                openSheetMusicDisplay.blurVoices([actualVoiceId], opacity);
            }
        }

        if (focusVoiceBtn) {
            focusVoiceBtn.onclick = function () {
                var voiceIndex = null;
                var opacity = 0.3;

                if (blurVoiceInput.value) {
                    voiceIndex = parseInt(blurVoiceInput.value);
                    if (isNaN(voiceIndex)) {
                        console.log("Invalid voice index");
                        return;
                    }
                } else {
                    console.log("Please enter a voice index");
                    return;
                }

                if (blurOpacityInput.value) {
                    opacity = parseFloat(blurOpacityInput.value);
                }

                var actualVoiceId = voiceIndex + 1;
                console.log("Focusing voice - Voice Index: " + voiceIndex + ", Voice ID: " + actualVoiceId + ", Blur Opacity: " + opacity);
                openSheetMusicDisplay.resetOpacity();
                openSheetMusicDisplay.blurAllVoicesExceptVoices([actualVoiceId], opacity);
            }
        }

        if (resetOpacityBtn) {
            resetOpacityBtn.onclick = function () {
                console.log("Resetting opacity for all notes");
                openSheetMusicDisplay.resetOpacity();
            }
        }

        if (updateTempoBtn && tempoBPMInput) {
            updateTempoBtn.onclick = function () {
                var newBPM = parseFloat(tempoBPMInput.value);
                if (isNaN(newBPM) || newBPM <= 0) {
                    console.log("[OSMD] Invalid BPM value");
                    if (tempoStatus && tempoStatusText) {
                        tempoStatusText.textContent = "Invalid BPM value";
                        tempoStatus.style.display = "block";
                    }
                    return;
                }

                var oldTempo = openSheetMusicDisplay.Sheet ? openSheetMusicDisplay.Sheet.getExpressionsStartTempoInBPM() : 0;
                if (oldTempo === 0) {
                    if (openSheetMusicDisplay.Sheet && openSheetMusicDisplay.Sheet.SourceMeasures.length > 0) {
                        oldTempo = openSheetMusicDisplay.Sheet.SourceMeasures[0].TempoInBPM;
                    }
                    if (oldTempo === 0) {
                        console.log("[OSMD] No tempo information found in sheet");
                        if (tempoStatus && tempoStatusText) {
                            tempoStatusText.textContent = "No tempo information found in sheet";
                            tempoStatus.style.display = "block";
                        }
                        return;
                    }
                }

                console.log("[OSMD] Updating tempo from " + oldTempo + " to " + newBPM + " BPM");
                openSheetMusicDisplay.updateTempo(newBPM);

                if (tempoStatus && tempoStatusText) {
                    var hasExpressions = openSheetMusicDisplay.Sheet && openSheetMusicDisplay.Sheet.TimestampSortedTempoExpressionsList.length > 0;
                    var message = "Updated tempo from " + oldTempo + " to " + newBPM + " BPM";
                    if (!hasExpressions) {
                        message += " (Note: Metronome marks only appear when tempo expressions exist in the sheet)";
                    }
                    tempoStatusText.textContent = message;
                    tempoStatus.style.display = "block";
                }

                logTempoChanges();
            }
        }

        if (logTempoBtn) {
            logTempoBtn.onclick = function () {
                logTempoChanges();
            }
        }

        if (blurStaffBtn && staffIndexInput && staffOpacityInput) {
            blurStaffBtn.onclick = function () {
                var staffIndex = parseInt(staffIndexInput.value);
                var opacity = parseFloat(staffOpacityInput.value) || 0.3;

                if (isNaN(staffIndex)) {
                    console.log("[OSMD] Please enter a valid staff index");
                    return;
                }

                console.log("[OSMD] Blurring staff " + staffIndex + " with opacity " + opacity);
                openSheetMusicDisplay.blurStaff(staffIndex, opacity);
            };
        }

        if (restoreStaffBtn && staffIndexInput) {
            restoreStaffBtn.onclick = function () {
                var staffIndex = parseInt(staffIndexInput.value);

                if (isNaN(staffIndex)) {
                    console.log("[OSMD] Please enter a valid staff index");
                    return;
                }

                console.log("[OSMD] Restoring staff " + staffIndex);
                openSheetMusicDisplay.restoreStaff(staffIndex);
            };
        }

        if (blurStaff0Btn) {
            blurStaff0Btn.onclick = function () {
                var opacity = staffOpacityInput ? parseFloat(staffOpacityInput.value) || 0.3 : 0.3;
                console.log("[OSMD] Blurring staff 0 with opacity " + opacity);
                openSheetMusicDisplay.blurStaff(0, opacity);
            };
        }

        if (blurStaff1Btn) {
            blurStaff1Btn.onclick = function () {
                var opacity = staffOpacityInput ? parseFloat(staffOpacityInput.value) || 0.3 : 0.3;
                console.log("[OSMD] Blurring staff 1 with opacity " + opacity);
                openSheetMusicDisplay.blurStaff(1, opacity);
            };
        }

        if (restoreAllStavesBtn) {
            restoreAllStavesBtn.onclick = function () {
                console.log("[OSMD] Restoring all staves");
                openSheetMusicDisplay.restoreStaff(0);
                openSheetMusicDisplay.restoreStaff(1);
            };
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

    function updateSelectionRangeToggleButtonLabel() {
        if (!toggleSelectionRangeBtn) {
            return;
        }
        toggleSelectionRangeBtn.textContent = isSelectionRangeHidden ? "Show Selection Range" : "Hide Selection Range";
    }

    function getRangeSelectionOverlayElement() {
        return canvas ? canvas.querySelector(".osmd-range-selection-overlay") : undefined;
    }

    function setSelectionRangeHidden(shouldHide, animate) {
        if (!openSheetMusicDisplay) {
            return;
        }
        if (isSelectionRangeHidden === shouldHide) {
            return;
        }
        var applyHiddenState = function () {
            isSelectionRangeHidden = shouldHide;
            openSheetMusicDisplay.setOptions({
                rangeSelection: {
                    options: {
                        hideSelectionRange: shouldHide
                    }
                }
            });
            renderAndScrollBack();
            updateSelectionRangeToggleButtonLabel();
        };
        if (!animate) {
            applyHiddenState();
            return;
        }
        var overlay = getRangeSelectionOverlayElement();
        if (shouldHide) {
            if (overlay) {
                overlay.style.transition = "opacity 180ms ease";
                overlay.style.opacity = "1";
                requestAnimationFrame(function () {
                    overlay.style.opacity = "0";
                });
            }
            window.setTimeout(function () {
                applyHiddenState();
            }, overlay ? 180 : 0);
            return;
        }
        applyHiddenState();
        window.setTimeout(function () {
            var nextOverlay = getRangeSelectionOverlayElement();
            if (!nextOverlay) {
                return;
            }
            nextOverlay.style.transition = "opacity 180ms ease";
            nextOverlay.style.opacity = "0";
            requestAnimationFrame(function () {
                nextOverlay.style.opacity = "1";
            });
        }, 0);
    }

    function updateMeasureRangeStatus(fromMeasure, toMeasure) {
        if (measureRangeStatus && measureRangeText) {
            var statusText;
            if (toMeasure === Number.MAX_SAFE_INTEGER) {
                statusText = "Showing all measures";
            } else if (fromMeasure === toMeasure) {
                statusText = "Showing measure " + fromMeasure;
            } else {
                statusText = "Showing measures " + fromMeasure + " to " + toMeasure;
            }
            measureRangeText.textContent = statusText;
            measureRangeStatus.style.display = "block";
        }
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

    /** After load: log hypothetical ledger-line note counts per semitone offset (-12..+12). */
    function logLedgerLineCountsForAllTransposeKeys() {
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
            return;
        }
        var sheet = openSheetMusicDisplay.Sheet;
        var counts = {};
        var s;
        for (s = -12; s <= 12; s += 1) {
            var label = s > 0 ? "+" + s : (s < 0 ? String(s) : "0");
            counts[label] = countLedgerLineNotesForTransposition(sheet, s);
        }
        console.log("[OSMD demo] hypothetical ledger-line note counts (semitones -12..+12; read-only, pre-Sheet.Transpose):", counts);
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
                renderAndScrollBack();

                logLedgerLineCountsForAllTransposeKeys();

                // Test updateTempo functionality
                testUpdateTempo();
            },
            function (e) {
                errorLoadingOrRenderingSheet(e, "rendering");
            }
        ).then(
            function () {
                addClickHandlersToChordSymbols();
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
            drawPartAbbreviationsOnFirstSystemStashedValue =
                openSheetMusicDisplay.EngravingRules.RenderPartAbbreviationsOnFirstSystem;
            openSheetMusicDisplay.setOptions({ drawPartNames: false, drawPartAbbreviations: false }); // TODO sets osmd.drawingParameters.DrawPartNames! also check EngravingRules.RenderPartAbbreviations, was false
            drawPartNamesOptionNeedsReset = true;
        } else if (drawPartNamesOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({
                drawPartNames: drawPartNamesOptionStashedValue,
                drawPartAbbreviations: drawPartAbbreviationsStashedValue,
                drawPartAbbreviationsOnFirstSystem: drawPartAbbreviationsOnFirstSystemStashedValue
            });
            drawPartNamesOptionNeedsReset = false;
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
        
        // Update measure range inputs with current sheet info
        if (openSheetMusicDisplay && openSheetMusicDisplay.Sheet && openSheetMusicDisplay.Sheet.SourceMeasures) {
            var totalMeasures = openSheetMusicDisplay.Sheet.SourceMeasures.length;
            if (measureToInput) {
                measureToInput.placeholder = totalMeasures.toString();
                measureToInput.max = totalMeasures;
            }
            if (measureFromInput) {
                measureFromInput.max = totalMeasures;
            }
            
            // Initialize status message
            updateMeasureRangeStatus(1, Number.MAX_SAFE_INTEGER);

            // Update tempo input with current initial tempo
            if (tempoBPMInput) {
                var initialTempo = openSheetMusicDisplay.Sheet.getExpressionsStartTempoInBPM();
                if (initialTempo > 0) {
                    tempoBPMInput.value = initialTempo;
                    tempoBPMInput.placeholder = initialTempo.toString();
                } else {
                    tempoBPMInput.value = "";
                    tempoBPMInput.placeholder = "No tempo";
                }
            }
        }

        if (drawPartAbbreviationsOnFirstSystemCheckbox && openSheetMusicDisplay && openSheetMusicDisplay.EngravingRules) {
            drawPartAbbreviationsOnFirstSystemCheckbox.checked =
                !!openSheetMusicDisplay.EngravingRules.RenderPartAbbreviationsOnFirstSystem;
        }
        
        // Enable controls again
        enable();
    }

    function logTempoChanges() {
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
            console.log("[OSMD] No sheet loaded");
            return;
        }

        console.log("=== Tempo Changes in Sheet ===");
        var tempoExpressions = openSheetMusicDisplay.Sheet.TimestampSortedTempoExpressionsList;

        if (tempoExpressions.length === 0) {
            console.log("No tempo expressions found");
            console.log("Measure tempos:");
            var measuresWithTempo = 0;
            for (var m = 0; m < openSheetMusicDisplay.Sheet.SourceMeasures.length && m < 10; m++) {
                var measure = openSheetMusicDisplay.Sheet.SourceMeasures[m];
                if (measure.TempoInBPM > 0) {
                    console.log("  Measure " + measure.MeasureNumber + ": " + measure.TempoInBPM + " BPM");
                    measuresWithTempo++;
                }
            }
            if (measuresWithTempo === 0) {
                console.log("  No measure tempos found");
            }
        } else {
            console.log("Found " + tempoExpressions.length + " tempo expression(s):");
            for (var i = 0; i < tempoExpressions.length; i++) {
                var tempoExpr = tempoExpressions[i];
                var measureNum = tempoExpr.SourceMeasureParent.MeasureNumber;
                var timestamp = tempoExpr.AbsoluteTimestamp.RealValue.toFixed(2);

                if (tempoExpr.InstantaneousTempo) {
                    console.log("  [" + i + "] Measure " + measureNum + " (timestamp: " + timestamp + "): " +
                        tempoExpr.InstantaneousTempo.TempoInBpm + " BPM (Instantaneous)");
                }
                if (tempoExpr.ContinuousTempo) {
                    console.log("  [" + i + "] Measure " + measureNum + " (timestamp: " + timestamp + "): " +
                        tempoExpr.ContinuousTempo.StartTempo + " -> " + tempoExpr.ContinuousTempo.EndTempo +
                        " BPM (Continuous)");
                }
            }
        }

        var initialTempo = openSheetMusicDisplay.Sheet.getExpressionsStartTempoInBPM();
        var firstMeasureTempo = openSheetMusicDisplay.Sheet.SourceMeasures.length > 0 ?
            openSheetMusicDisplay.Sheet.SourceMeasures[0].TempoInBPM : 0;
        var userStartTempo = openSheetMusicDisplay.Sheet.userStartTempoInBPM;
        console.log("Initial tempo (from expressions): " + initialTempo + " BPM");
        if (firstMeasureTempo > 0) {
            console.log("First measure tempo: " + firstMeasureTempo + " BPM");
        }
        if (userStartTempo > 0 && userStartTempo !== initialTempo) {
            console.log("User start tempo: " + userStartTempo + " BPM");
        }
        console.log("==============================");
    }

    function testUpdateTempo() {
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
            return;
        }

        var initialTempo = openSheetMusicDisplay.Sheet.getExpressionsStartTempoInBPM();
        if (initialTempo === 0) {
            console.log("[OSMD] No tempo information found in sheet, skipping tempo update test");
            return;
        }

        console.log("\n[OSMD] Testing updateTempo() - Current initial tempo: " + initialTempo + " BPM");
        logTempoChanges();

        // Test: Change from current tempo to 120 BPM (or 90 if current is 120)
        var newTempo = initialTempo === 120 ? 90 : 120;
        console.log("\n[OSMD] Updating tempo from " + initialTempo + " to " + newTempo + " BPM...");

        openSheetMusicDisplay.updateTempo(newTempo);

        console.log("\n[OSMD] After updateTempo(" + newTempo + "):");
        logTempoChanges();
    }

    function demoHandModeToggle() {
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.Sheet) {
            return;
        }

        var firstInstrument = openSheetMusicDisplay.Sheet.Instruments && openSheetMusicDisplay.Sheet.Instruments[0];
        if (!firstInstrument || !firstInstrument.Staves || firstInstrument.Staves.length < 2) {
            console.log("[OSMD] Hand mode toggle demo: Sheet does not have 2 staves (piano format), skipping demo");
            return;
        }

        console.log("\n[OSMD] Hand Mode Toggle Demo");
        console.log("==============================");
        console.log("Available hand modes:");
        console.log("  - 'left-hand-only': Blurs right hand staff and voices");
        console.log("  - 'right-hand-only': Blurs left hand staff and voices");
        console.log("  - 'both-hands': Shows both hands (default)");
        console.log("\nCurrent hand mode: " + currentHandMode);
        console.log("\nYou can toggle hand modes using the UI buttons:");
        console.log("  - Left Hand Only button");
        console.log("  - Right Hand Only button");
        console.log("  - Both Hands button");
        console.log("\nOr programmatically:");
        console.log("  currentHandMode = 'left-hand-only'; applyHandMode();");
        console.log("  currentHandMode = 'right-hand-only'; applyHandMode();");
        console.log("  currentHandMode = 'both-hands'; applyHandMode();");
        console.log("==============================");
    }

    /**
     * Example: Add click handlers to chord symbols (harmony symbols)
     */
    function addClickHandlersToChordSymbols() {
        if (!openSheetMusicDisplay || !openSheetMusicDisplay.graphic) {
            return;
        }

        // Only works with SVG backend
        if (openSheetMusicDisplay.backendType !== BackendType.SVG) {
            console.log("[OSMD demo] Chord symbol click handlers only work with SVG backend");
            return;
        }

        // Wait a bit for SVG elements to be fully rendered in the DOM
        setTimeout(function () {
            const chordSymbols = openSheetMusicDisplay.getAllChordSymbolContainers();
            let chordsWithHandlers = 0;
            let chordsWithoutSVG = 0;

            console.log("[OSMD demo] Found " + chordSymbols.length + " chord symbol containers");

            for (const chordContainer of chordSymbols) {
                const graphicalLabel = chordContainer.GraphicalLabel;

                // Check if SVG node exists - SVG elements are Element, not HTMLElement
                if (!graphicalLabel.SVGNode) {
                    chordsWithoutSVG++;
                    continue;
                }

                // SVG elements are Element instances, not HTMLElement
                var svgElement = graphicalLabel.SVGNode;
                if (!(svgElement instanceof Element)) {
                    chordsWithoutSVG++;
                    continue;
                }

                // Add click handler using GraphicalLabel method
                graphicalLabel.setClickHandler(function (event) {
                    const chordData = chordContainer.GetChordSymbolContainer;
                    const chordText = graphicalLabel.Label.text;

                    console.log("Chord symbol clicked:", {
                        chordText: chordText,
                        rootPitch: chordData.RootPitch ? chordData.RootPitch.ToString() : "N/A",
                        chordKind: chordData.ChordKind !== undefined ? chordData.ChordKind.toString() : "N/A",
                        bassPitch: chordData.BassPitch ? chordData.BassPitch.ToString() : "N/A",
                        placement: chordData.Placement !== undefined ? chordData.Placement.toString() : "N/A"
                    });

                    // Example: highlight the chord symbol on click
                    // SVGNode might be a group (g) or text element
                    var targetElement = graphicalLabel.SVGNode;
                    var textElements = targetElement.querySelectorAll("text");

                    // If it's a text element itself, include it
                    if (targetElement.nodeName === 'text' || targetElement.tagName === 'text') {
                        if (textElements.length === 0) {
                            textElements = [targetElement];
                        }
                    }

                    var isHighlighted = false;
                    if (textElements.length > 0) {
                        var firstFill = textElements[0].getAttribute("fill");
                        isHighlighted = firstFill === "#FF6B6B" || firstFill === "rgb(255, 107, 107)";
                    }

                    if (isHighlighted) {
                        // Reset text fill
                        for (var i = 0; i < textElements.length; i++) {
                            textElements[i].setAttribute("fill", "");
                        }
                    } else {
                        // Set text fill color
                        for (var i = 0; i < textElements.length; i++) {
                            textElements[i].setAttribute("fill", "#FF6B6B");
                        }
                    }
                });

                chordsWithHandlers++;
            }

            if (chordsWithHandlers > 0) {
                console.log("[OSMD demo] Added click handlers to " + chordsWithHandlers + " chord symbols");
            } else {
                console.log("[OSMD demo] No chord symbols with SVG nodes found");
                if (chordsWithoutSVG > 0) {
                    console.log("[OSMD demo] " + chordsWithoutSVG + " chord symbols found but without SVG nodes");
                }
            }
        }, 100); // Small delay to ensure SVG is fully rendered
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
        // Add "Custom..." score
        selectSample.appendChild(custom);
        custom.selected = "selected";
        // Read dragged file
        var reader = new FileReader();
        reader.onload = function (res) {
            selectSampleOnChange(res.target.result);
        };
        var filename = event.dataTransfer.files[0].name;
        if (filename.toLowerCase().indexOf(".xml") > 0
            || filename.toLowerCase().indexOf(".musicxml") > 0) {
            reader.readAsText(event.dataTransfer.files[0]);
        } else if (event.dataTransfer.files[0].name.toLowerCase().indexOf(".mxl") > 0) {
            reader.readAsBinaryString(event.dataTransfer.files[0]);
        }
        else {
            alert("No vaild .xml/.mxl/.musicxml file!");
        }
    });
}());
