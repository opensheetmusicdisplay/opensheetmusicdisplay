// This file exposes the APIs of OSMD objects

export class MusicSheetWrapper {
    constructor() {
        return;
    }
}


// Expose the API
let api: any = {
    "MusicSheet": MusicSheetWrapper,
};

declare var module: any;
if (typeof module !== "undefined") {
    module.exports = api;
} else {
    (window as any).osmd = api;
}
