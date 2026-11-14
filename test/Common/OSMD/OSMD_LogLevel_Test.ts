import { expect } from "vitest";
import loglevel from "loglevel";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { log } from "../../../src/Common/Logging";

/**
 * OSMD logs with its own loglevel logger, named "OSMD" (src/Common/Logging.ts). Before, setLogLevel() set
 * loglevel's root logger, the level of every loglevel user on the page, and saved it in localStorage.
 */
describe("OSMD's log level", () => {
    let rootLevel: loglevel.LogLevelNumbers;
    let osmdLevel: loglevel.LogLevelNumbers;
    let container: HTMLElement;
    beforeEach(() => {
        rootLevel = loglevel.getLevel();
        osmdLevel = log.getLevel();
        container = document.createElement("div");
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
        // the other test files run in the same page
        loglevel.setLevel(rootLevel, false);
        log.resetLevel();
        if (log.getLevel() !== osmdLevel) {
            log.setLevel(osmdLevel, false);
        }
    });

    /** The localStorage entries of loglevel (its root logger saves its level as "loglevel", a named one as "loglevel:<name>"). */
    function loglevelStorageEntries(): string[] {
        return Object.keys(localStorage).filter(key => key.startsWith("loglevel")).map(key => `${key}=${localStorage.getItem(key)}`);
    }

    it("setLogLevel() sets OSMD's level for all instances, not the root logger's level, and saves nothing in localStorage", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        const otherOsmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        const storageBefore: string[] = loglevelStorageEntries();
        const levels: [string, number][] = [
            ["trace", log.levels.TRACE], ["debug", log.levels.DEBUG], ["info", log.levels.INFO],
            ["warn", log.levels.WARN], ["error", log.levels.ERROR], ["silent", log.levels.SILENT],
        ];
        for (const [name, level] of levels) {
            osmd.setLogLevel(name);
            expect(osmd.getLogLevel(), `OSMD's level after setLogLevel("${name}")`).to.equal(level);
            expect(otherOsmd.getLogLevel(), `the other instance's level after setLogLevel("${name}")`).to.equal(level);
            expect(loglevel.getLevel(), `the root logger's level after setLogLevel("${name}")`).to.equal(rootLevel);
        }
        expect(loglevelStorageEntries(), "loglevel's localStorage entries").to.deep.equal(storageBefore);
    });

    it("logs with the root logger's level until setLogLevel() is called", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        log.resetLevel(); // as before OSMD's first setLogLevel()
        // A named logger takes the root logger's level when it's created (when OSMD loads) and on rebuild().
        loglevel.setLevel(loglevel.levels.ERROR, false);
        loglevel.rebuild();
        expect(osmd.getLogLevel(), "OSMD's level after the root logger's").to.equal(log.levels.ERROR);

        osmd.setLogLevel("debug");
        loglevel.setLevel(loglevel.levels.SILENT, false);
        loglevel.rebuild();
        expect(osmd.getLogLevel(), "OSMD's level after setLogLevel(), then the root logger's").to.equal(log.levels.DEBUG);
    });

    it("setLogLevel() with an unknown level warns and sets warn", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setLogLevel("info");
        const messages: string[] = TestUtils.catchLogs();
        osmd.setLogLevel("verbose");
        expect(osmd.getLogLevel(), "OSMD's level").to.equal(log.levels.WARN);
        expect(messages, "the warnings").to.deep.equal(["Could not set log level to verbose. Using warn instead."]);
    });
});
