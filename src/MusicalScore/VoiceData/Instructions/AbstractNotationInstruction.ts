import {SourceStaffEntry} from "../SourceStaffEntry";

export abstract class AbstractNotationInstruction {

    constructor(parent: SourceStaffEntry) {
        this.parent = parent;
    }

    protected parent: SourceStaffEntry;
    /** States whether the object should be displayed. False if xmlNode.attribute("print-object").value = "no". */
    private printObject: boolean = true;

    public get Parent(): SourceStaffEntry {
        return this.parent;
    }
    public set Parent(value: SourceStaffEntry) {
        this.parent = value;
    }

    public get PrintObject(): boolean {
        return this.printObject;
    }

    public set PrintObject(value: boolean) {
        this.printObject = value;
    }
}
