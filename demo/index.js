import { OpenSheetMusicDisplay } from '../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay';

/*jslint browser:true */
(function () {
    "use strict";
    var openSheetMusicDisplay;
    // The folder of the demo files
    var folder = process.env.STATIC_FILES_SUBFOLDER ? process.env.STATIC_FILES_SUBFOLDER + "/" : "",
    // The available demos
        demos = {
            "Beethoven - An die ferne Geliebte": "Beethoven_AnDieFerneGeliebte.xml",
            "M. Clementi - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "M. Clementi - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
            "M. Clementi - Sonatina Op.36 No.3 Pt.1": "MuzioClementi_SonatinaOpus36No3_Part1.xml",
            "M. Clementi - Sonatina Op.36 No.3 Pt.2": "MuzioClementi_SonatinaOpus36No3_Part2.xml",
            "J.S. Bach - Praeludium In C Dur BWV846 1": "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
            "J.S. Bach - Air": "JohannSebastianBach_Air.xml",
            "C. Gounod - Meditation": "CharlesGounod_Meditation.xml",
            "J. Haydn - Concertante Cello": "JosephHaydn_ConcertanteCello.xml",
            "Mozart - An Chloe": "Mozart_AnChloe.xml",
            "Mozart - Das Veilchen": "Mozart_DasVeilchen.xml",
            "Mozart - Trio": "MozartTrio.mxl",
            "S. Joplin - Elite Syncopations": "ScottJoplin_EliteSyncopations.xml",
            "S. Joplin - The Entertainer": "ScottJoplin_The_Entertainer.xml",
            "ActorPreludeSample": "ActorPreludeSample.xml",
            "R. Schumann - Dichterliebe": "Dichterliebe01.xml",
            "C. Debussy - Mandoline": "Debussy_Mandoline.xml",
            "France Levasseur - Parlez Mois": "Parlez-moi.mxl",
            "Telemann - Sonate-Nr.1.1-Dolce": "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
            "Telemann - Sonate-Nr.1.2-Allegro": "TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml",
            "Saltarello": "Saltarello.mxl",
        },

        zoom = 1.0,
    // HTML Elements in the page
        err,
        error_tr,
        canvas,
        select,
        zoomIn,
        zoomOut,
        size,
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
        size = document.getElementById("size-str");
        zoomDiv = document.getElementById("zoom-str");
        custom = document.createElement("option");
        select = document.getElementById("select");
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
        for (name in demos) {
            if (demos.hasOwnProperty(name)) {
                option = document.createElement("option");
                option.value = demos[name];
                option.textContent = name;
            }
            select.appendChild(option);
        }
        select.onchange = selectOnChange;

        // Pre-select default music piece
        select.value = "MuzioClementi_SonatinaOpus36No1_Part1.xml";

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
            selectOnChange();

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

    function selectOnChange(str) {
        error();
        disable();
        var isCustom = typeof str === "string";
        if (!isCustom) {
            str = folder + select.value;
        }
        zoom = 1.0;
        openSheetMusicDisplay.load(str).then(
            function() {
                return openSheetMusicDisplay.render();
            },
            function(e) {
                error("Error reading sheet: " + e);
            }
        ).then(
            function() {
                return onLoadingEnd(isCustom);
            }, function(e) {
                error("Error rendering sheet: " + process.env.DEBUG ? e.stack : e);
                onLoadingEnd(isCustom);
            }
        );
    }

    function onLoadingEnd(isCustom) {
        // Remove option from select
        if (!isCustom && custom.parentElement === select) {
            select.removeChild(custom);
        }
        // Enable controls again
        enable();
    }

    function logCanvasSize() {
        size.innerHTML = canvas.offsetWidth + "px";
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
        select.disabled = zoomIn.disabled = zoomOut.disabled = "disabled";
    }
    function enable() {
        document.body.style.opacity = 1;
        select.disabled = zoomIn.disabled = zoomOut.disabled = "";
        logCanvasSize();
    }

    // Register events: load, drag&drop
    window.addEventListener("load", function() {
        init();
        selectOnChange();
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
        select.appendChild(custom);
        custom.selected = "selected";
        // Read dragged file
        var reader = new FileReader();
        reader.onload = function (res) {
            selectOnChange(res.target.result);
        };
        if (event.dataTransfer.files[0].name.toLowerCase().indexOf(".xml") > 0) {
            reader.readAsText(event.dataTransfer.files[0]);
        }
        else if (event.dataTransfer.files[0].name.toLowerCase().indexOf(".mxl") > 0){
            reader.readAsBinaryString(event.dataTransfer.files[0]);
        }
        else {
            alert("No vaild .xml/.mxl file!");
        }
    });
}());
