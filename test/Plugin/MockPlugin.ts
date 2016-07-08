import chai = require("chai");

import { IEventSource, IPlugin } from "../../src/Plugin";

export class MockPlugin implements IPlugin {

    public onSheetLoadedSpy: any;

    public getIdentifier(): string {
        return "MOCK_PLUGIN";
    }

    public registerEvents(eventSource: IEventSource): void {
        this.onSheetLoadedSpy = chai.spy();
        eventSource.OnSheetLoaded.on(this.onSheetLoadedSpy);
    }

    public unregisterEvents(eventSource: IEventSource): void {
        eventSource.OnSheetLoaded.off(this.onSheetLoadedSpy);
        this.onSheetLoadedSpy = undefined;
    }
}
