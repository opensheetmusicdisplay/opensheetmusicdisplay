/** A class, e.g. GraphicalMeasure, also an abstract one: its constructor, which instanceof compares objects with. */
export type ClassType<T = unknown> = abstract new (...args: any[]) => T;

export abstract class AClassHierarchyTrackable {
    //TODO: This pattern doesn't account for interfaces, only classes.
    //At present, it seems that interfaces need tested manually when they are needed.
    //Perhaps there is a better solution, but right now I don't see it. This is fine for our requirements currently
    /**
     * Returns whether this object is an instance of the class, e.g. isInstanceOfClass(GraphicalMeasure).
     * @param classOrName The class, or its name (e.g. GraphicalMeasure.name). A name is unreliable in minified builds:
     *   they rename the classes, and give different classes the same name, e.g. "a" to GraphicalMeasure and GraphicalNote.
     */
    public isInstanceOfClass(classOrName: ClassType | string): boolean {
        if (typeof classOrName !== "string") {
            return this instanceof classOrName;
        }
        let proto: any = this.constructor.prototype;
        while (proto) {
            if (classOrName === proto.constructor.name) {
                return true;
            }
            proto = proto.__proto__;
        }
        return false;
    }
}
