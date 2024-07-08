import { TwilineMessage } from '../platform/signal';

/**
 * The interface common for all TWILINE accessories.
 */
export interface TwilineAccessory {
    readonly reference: string;
    readonly name: string;
    /**
     * When the platform receives a message for an accessory it will be passed to the accessory
     * by this method. Mostly it will contain state information that can be used to update the
     * state of an accessory.
     *
     * @param message the received message as an object, created from the JSON
     */
    handleMessage(message: TwilineMessage): void;
}