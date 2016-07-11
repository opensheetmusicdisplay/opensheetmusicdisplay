import chai = require("chai");

import { IEventSource, IPlugin } from "../../src/Plugin";

/**
 * A mock implementation of [[IPlugin]] used for tests. It will register on all events
 * emitted by a [[IEventSource]] and provide chai spies to check on those events. This
 * class will identify itself as an OSMD plugin called `MOCK_PLUGIN`.
 */
export class MockPlugin implements IPlugin {

    private onSheetLoadedSpy: any;

    get OnSheetLoadedSpy(): any {
        return this.onSheetLoadedSpy;
    }

    public getIdentifier(): string {
        return "MOCK_PLUGIN";
    }

    public registerEvents(eventSource: IEventSource): void {
        // OnSheetLoaded
        this.onSheetLoadedSpy = chai.spy();
        eventSource.OnSheetLoaded.on(this.onSheetLoadedSpy);
    }

    public unregisterEvents(eventSource: IEventSource): void {
        // OnSheetLoaded
        eventSource.OnSheetLoaded.off(this.onSheetLoadedSpy);
        this.onSheetLoadedSpy = undefined;
    }
}
