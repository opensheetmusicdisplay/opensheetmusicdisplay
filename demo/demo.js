/*jslint browser:true */
(function () {
    "use strict";
    var OSMD;
    // The folder of the demo files
    var folder = "sheets/",
    // The available demos
        demos = {
            "M. Clementi - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "M. Clementi - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
            "M. Clementi - Sonatina Op.36 No.3 Pt.1": "MuzioClementi_SonatinaOpus36No3_Part1.xml",
            "M. Clementi - Sonatina Op.36 No.3 Pt.2": "MuzioClementi_SonatinaOpus36No3_Part2.xml",
            "J.S. Bach - Air": "JohannSebastianBach_Air.xml",
            "G.P. Telemann - Sonata, TWV 40:102 - 1. Dolce": "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
            "C. Gounod - Meditation": "CharlesGounod_Meditation.xml",
            "J.S. Bach - Praeludium In C Dur BWV846 1": "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
            "J. Haydn - Concertante Cello": "JosephHaydn_ConcertanteCello.xml",
            "S. Joplin - Elite Syncopations": "ScottJoplin_EliteSyncopations.xml",
            "S. Joplin - The Entertainer": "ScottJoplin_The_Entertainer.xml",
            "ActorPreludeSample": "ActorPreludeSample.xml",
            "an chloe - mozart": "an chloe - mozart.xml",
            "Beethoven - AnDieFerneGeliebte": "AnDieFerneGeliebte_Beethoven.xml",
            "das veilchen - mozart": "das veilchen - mozart.xml",
            "Dichterliebe01": "Dichterliebe01.xml",
            "mandoline - debussy": "mandoline - debussy.xml",
            "MozartTrio": "MozartTrio.mxl",
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
        hideCursorBtn;

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
        OSMD = new opensheetmusicdisplay.OSMD(canvas);
        OSMD.setLogLevel('info');
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
                OSMD.render();
                } catch (e) {}
                enable();
            }
        );

        window.addEventListener("keydown", function(e) {
            var event = window.event ? window.event : e;
            if (event.keyCode === 39) {
                OSMD.cursor.next();
            }
        });
        nextCursorBtn.addEventListener("click", function() {
            OSMD.cursor.next();
        });
        resetCursorBtn.addEventListener("click", function() {
            OSMD.cursor.reset();
        });
        hideCursorBtn.addEventListener("click", function() {
            OSMD.cursor.hide();
        });
        showCursorBtn.addEventListener("click", function() {
            OSMD.cursor.show();
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
        OSMD.load(str).then(
            function() {
                return OSMD.render();
            },
            function(e) {
                error("Error reading sheet: " + e);
            }
        ).then(
            function() {
                return onLoadingEnd(isCustom);
            }, function(e) {
                error("Error rendering sheet: " + e);
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
        size.innerHTML = canvas.offsetWidth;
        zoomDiv.innerHTML = Math.floor(zoom * 100.0);
    }

    function scale() {
        disable();
        window.setTimeout(function(){
            OSMD.zoom = zoom;
            OSMD.render();
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
