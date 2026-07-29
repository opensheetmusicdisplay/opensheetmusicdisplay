import { BrailleOutput, BrailleDebugEntry } from "./BrailleConverter";

/**
 * Creates DOM elements to display braille music output.
 * Renders the braille text into a container element, optionally with
 * a debug/translation view showing what each braille character means.
 */
export class BrailleDOMRenderer {

    /**
     * Create a DOM element containing the braille output.
     *
     * @param output The BrailleOutput from BrailleConverter.convert()
     * @param debugMode Whether to show debug/translation annotations
     * @returns An HTMLElement ready to be appended to the page
     */
    public render(output: BrailleOutput, debugMode: boolean = false): HTMLElement {
        const container: HTMLElement = document.createElement("div");
        container.className = "osmd-braille-output";

        // Main braille text display
        const brailleText: HTMLElement = document.createElement("pre");
        brailleText.className = "osmd-braille-text";
        brailleText.textContent = output.text;
        brailleText.setAttribute("aria-label", "Music Braille Output");
        brailleText.style.fontSize = "24px";
        brailleText.style.lineHeight = "1.5";
        brailleText.style.fontFamily = "serif"; // Braille fonts vary; user can override via CSS
        container.appendChild(brailleText);

        // Debug/translation view
        if (debugMode && output.debugEntries.length > 0) {
            const debugDiv: HTMLElement = this.renderDebugView(output.debugEntries);
            container.appendChild(debugDiv);
        }

        return container;
    }

    /**
     * Render the debug/translation view as a paragraph showing each braille
     * element with its meaning.
     */
    private renderDebugView(entries: BrailleDebugEntry[]): HTMLElement {
        const debugDiv: HTMLElement = document.createElement("div");
        debugDiv.className = "osmd-braille-debug";
        debugDiv.style.marginTop = "12px";
        debugDiv.style.fontFamily = "monospace";
        debugDiv.style.fontSize = "12px";
        debugDiv.style.color = "#666";

        // Create a paragraph showing braille → meaning translations
        const translationParagraph: HTMLElement = document.createElement("p");
        translationParagraph.className = "osmd-braille-translation";

        let currentMeasure: number = -1;
        for (const entry of entries) {
            // Add measure number headers
            if (entry.measureNumber !== currentMeasure) {
                if (currentMeasure !== -1) {
                    translationParagraph.appendChild(document.createTextNode(" | "));
                }
                const measureLabel: HTMLElement = document.createElement("strong");
                measureLabel.textContent = "m" + entry.measureNumber + ": ";
                translationParagraph.appendChild(measureLabel);
                currentMeasure = entry.measureNumber;
            }

            // Create a span for each braille element with hover text
            const span: HTMLElement = document.createElement("span");
            span.className = "osmd-braille-debug-entry";
            span.textContent = "[" + entry.meaning + "]";
            span.title = "Braille: " + entry.braille;
            span.style.marginRight = "4px";
            translationParagraph.appendChild(span);
        }

        debugDiv.appendChild(translationParagraph);
        return debugDiv;
    }
}
