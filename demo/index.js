import { OpenSheetMusicDisplay } from '../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay';

/*jslint browser:true */
(function () {
    "use strict";
    var openSheetMusicDisplay;
    // folder of the sample files
    var sampleFolder = process.env.STATIC_FILES_SUBFOLDER ? process.env.STATIC_FILES_SUBFOLDER + "/" : "",
        samples = {
            "Beethoven, L.v. - An die ferne Geliebte": "Beethoven_AnDieFerneGeliebte.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.1": "MuzioClementi_SonatinaOpus36No3_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.2": "MuzioClementi_SonatinaOpus36No3_Part2.xml",
            "Bach, J.S. - Praeludium in C-Dur BWV846 1": "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
            "Bach, J.S. - Air": "JohannSebastianBach_Air.xml",
            "Gounod, C. - Meditation": "CharlesGounod_Meditation.xml",
            "Haydn, J. - Concertante Cello": "JosephHaydn_ConcertanteCello.xml",
            "Joplin, S. - Elite Syncopations": "ScottJoplin_EliteSyncopations.xml",
            "Joplin, S. - The Entertainer": "ScottJoplin_The_Entertainer.xml",
            "Mozart, W.A. - An Chloe": "Mozart_AnChloe.xml",
            "Mozart, W.A. - Das Veilchen": "Mozart_DasVeilchen.xml",
            "Mozart, W.A.- Clarinet Quintet (Excerpt)": "Mozart_Clarinet_Quintet_Excerpt.mxl",
            "Mozart/Holzer - Land der Berge (national anthem of Austria)": "Land_der_Berge.musicxml",
            "OSMD Function Test - All": "OSMD_function_test_all.xml",
            "OSMD Function Test - Grace Notes": "OSMD_function_test_GraceNotes.xml",
            "OSMD Function Test - Ornaments": "OSMD_function_test_Ornaments.xml",
            "OSMD Function Test - Accidentals": "OSMD_function_test_accidentals.musicxml",
            "Schubert, F. - An Die Musik": "Schubert_An_die_Musik.xml",
            "Actor, L. - Prelude (Sample)": "ActorPreludeSample.xml",
            "Anonymous - Saltarello": "Saltarello.mxl",
            "Debussy, C. - Mandoline": "Debussy_Mandoline.xml",
            "Levasseur, F. - Parlez Mois": "Parlez-moi.mxl",
            "Schumann, R. - Dichterliebe": "Dichterliebe01.xml",
            "Telemann, G.P. - Sonate-Nr.1.1-Dolce": "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
            "Telemann, G.P. - Sonate-Nr.1.2-Allegro": "TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml",
        },

        zoom = 1.0,
    // HTML Elements in the page
        err,
        error_tr,
        canvas,
        selectSample,
        selectBounding,
        skylineDebug,
        bottomlineDebug,
        zoomIn,
        zoomOut,
        zoomDiv,
        custom,
        nextCursorBtn,
        resetCursorBtn,
        showCursorBtn,
        hideCursorBtn,
        backendSelect;

    // Initialization code
    function init() {
        var name, option;

        err = document.getElementById("error-td");
        error_tr = document.getElementById("error-tr");
        zoomDiv = document.getElementById("zoom-str");
        custom = document.createElement("option");
        selectSample = document.getElementById("selectSample");
        selectBounding = document.getElementById("selectBounding");
        skylineDebug = document.getElementById("skylineDebug");
        bottomlineDebug = document.getElementById("bottomlineDebug");
        zoomIn = document.getElementById("zoom-in-btn");
        zoomOut = document.getElementById("zoom-out-btn");
        canvas = document.createElement("div");
        nextCursorBtn = document.getElementById("next-cursor-btn");
        resetCursorBtn = document.getElementById("reset-cursor-btn");
        showCursorBtn = document.getElementById("show-cursor-btn");
        hideCursorBtn = document.getElementById("hide-cursor-btn");
        backendSelect = document.getElementById("backend-select");

        // Hide error
        error();

        // Create select
        for (name in samples) {
            if (samples.hasOwnProperty(name)) {
                option = document.createElement("option");
                option.value = samples[name];
                option.textContent = name;
            }
            selectSample.appendChild(option);
        }
        selectSample.onchange = selectSampleOnChange;
        selectBounding.onchange = selectBoundingOnChange;

        // Pre-select default music piece

        custom.appendChild(document.createTextNode("Custom"));

        // Create zoom controls
        zoomIn.onclick = function () {
            zoom *= 1.2;
            scale();
        };
        zoomOut.onclick = function () {
            zoom /= 1.2;
            scale();
        };

        skylineDebug.onclick = function() {
            openSheetMusicDisplay.DrawSkyLine = !openSheetMusicDisplay.DrawSkyLine;
        }

        bottomlineDebug .onclick = function() {
            openSheetMusicDisplay.DrawBottomLine = !openSheetMusicDisplay.DrawBottomLine;
        }

        // Create OSMD object and canvas
        openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, false, backendSelect.value);
        openSheetMusicDisplay.setLogLevel('info');
        document.body.appendChild(canvas);

        // Set resize event handler
        new Resize(
            function(){
                disable();
            },
            function() {
                var width = document.body.clientWidth;
                canvas.width = width;
                try {
                openSheetMusicDisplay.render();
                } catch (e) {}
                enable();
            }
        );

        window.addEventListener("keydown", function(e) {
            var event = window.event ? window.event : e;
            if (event.keyCode === 39) {
                openSheetMusicDisplay.cursor.next();
            }
        });
        nextCursorBtn.addEventListener("click", function() {
            openSheetMusicDisplay.cursor.next();
        });
        resetCursorBtn.addEventListener("click", function() {
            openSheetMusicDisplay.cursor.reset();
        });
        hideCursorBtn.addEventListener("click", function() {
            openSheetMusicDisplay.cursor.hide();
        });
        showCursorBtn.addEventListener("click", function() {
            openSheetMusicDisplay.cursor.show();
        });

        backendSelect.addEventListener("change", function(e) {
            var value = e.target.value;
            // clears the canvas element
            canvas.innerHTML = "";
            openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, false, value);
            openSheetMusicDisplay.setLogLevel('info');
            selectSampleOnChange();

        });
    }

    function Resize(startCallback, endCallback) {

      var rtime;
      var timeout = false;
      var delta = 200;

      function resizeEnd() {
        timeout = window.clearTimeout(timeout);
        if (new Date() - rtime < delta) {
          timeout = setTimeout(resizeEnd, delta);
        } else {
          endCallback();
        }
      }

      window.addEventListener("resize", function () {
        rtime = new Date();
        if (!timeout) {
          startCallback();
          rtime = new Date();
          timeout = window.setTimeout(resizeEnd, delta);
        }
      });

      window.setTimeout(startCallback, 0);
      window.setTimeout(endCallback, 1);
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
            str = sampleFolder + selectSample.value;
        }
        zoom = 1.0;
        openSheetMusicDisplay.load(str).then(
            function() {
                return openSheetMusicDisplay.render();
            },
            function(e) {
                console.warn(e.stack);
                error("Error reading sheet: " + e);
            }
        ).then(
            function() {
                return onLoadingEnd(isCustom);
            }, function(e) {
                console.warn(e.stack);
                error("Error rendering sheet: " + process.env.DEBUG ? e.stack : e);
                onLoadingEnd(isCustom);
            }
        );
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
        zoomDiv.innerHTML = Math.floor(zoom * 100.0) + "%";
    }

    function scale() {
        disable();
        window.setTimeout(function(){
            openSheetMusicDisplay.zoom = zoom;
            openSheetMusicDisplay.render();
            enable();
        }, 0);
    }

    function error(errString) {
        if (!errString) {
            error_tr.style.display = "none";
        } else {
            err.textContent = errString;
            error_tr.style.display = "";
            canvas.width = canvas.height = 0;
            enable();
        }
    }

    // Enable/Disable Controls
    function disable() {
        document.body.style.opacity = 0.3;
        selectSample.disabled = zoomIn.disabled = zoomOut.disabled = "disabled";
    }
    function enable() {
        document.body.style.opacity = 1;
        selectSample.disabled = zoomIn.disabled = zoomOut.disabled = "";
        logCanvasSize();
    }

    // Register events: load, drag&drop
    window.addEventListener("load", function() {
        init();
        selectSampleOnChange();
    });
    window.addEventListener("dragenter", function(event) {
        event.preventDefault();
        disable();
    });
    window.addEventListener("dragover", function(event) {
        event.preventDefault();
    });
    window.addEventListener("dragleave", function(event) {
        enable();
    });
    window.addEventListener("drop", function(event) {
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
        } else if (event.dataTransfer.files[0].name.toLowerCase().indexOf(".mxl") > 0){
            reader.readAsBinaryString(event.dataTransfer.files[0]);
        }
        else {
            alert("No vaild .xml/.mxl/.musicxml file!");
        }
    });
}());
