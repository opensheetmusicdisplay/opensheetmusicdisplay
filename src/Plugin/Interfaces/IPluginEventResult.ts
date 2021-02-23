export enum MessageSeverity{
    INFO,
    LOG,
    WARN,
    ERROR
}
//TODO: very basic for now. Use enum, etc.
export interface IPluginEventResult {
    Message: string;
    Severity: MessageSeverity;
}
