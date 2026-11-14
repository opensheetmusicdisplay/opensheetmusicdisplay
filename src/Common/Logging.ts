import loglevel from "loglevel";

/**
 * OSMD's logger: loglevel's logger named "OSMD", which all of OSMD logs with, instead of loglevel's root logger, so that
 * OSMD's level (`OpenSheetMusicDisplay.setLogLevel()`) doesn't change the level of the page's other loglevel users.
 *
 * Until its own level is set, it has the level the root logger has when this module loads (`warn` by default, or a level
 * persisted earlier under loglevel's localStorage key), and again after `loglevel.rebuild()` on the root logger.
 */
export const log: loglevel.Logger = loglevel.getLogger("OSMD");
