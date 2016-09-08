import * as shortid from "shortid";

export abstract class BaseIdClass {

    protected instanceId: string;

    constructor() {
        this.instanceId = shortid.generate();
    }

    public toString(): string {
        return this.instanceId;
    }
}
