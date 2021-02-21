export interface IControllerOutputListener {
    outputChanged(directlySet: boolean, currentValue: number, expectedValue: number): void;
}
