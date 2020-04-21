//import shortid from "shortid";

/**
 * Support for the unique id generator.
 */
export abstract class BaseIdClass {

    protected instanceId: string;

    constructor() {
        //this.instanceId = shortid.generate();
    }

    public toString(): string {
        return this.instanceId;
    }

}
