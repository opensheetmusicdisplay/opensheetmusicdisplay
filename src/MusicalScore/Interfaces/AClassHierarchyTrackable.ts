export abstract class AClassHierarchyTrackable {
    //TODO: This pattern doesn't account for interfaces, only classes.
    //At present, it seems that interfaces need tested manually when they are needed.
    //Perhaps there is a better solution, but right now I don't see it. This is fine for our requirements currently
    public isInstanceOfClass(className: string): boolean {
        let proto: any = this.constructor.prototype;
        while (proto) {
            if (className === proto.constructor.name) {
                return true;
            }
            proto = proto.__proto__;
        }
        return false;
    }
}
