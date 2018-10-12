export interface ISqueezable {
    /**
     * Squeezes the wedge by the given amount.
     * @param value Squeeze amount. Positive values squeeze from the left, negative from the right
     */
    squeeze(value: number): void;
}
