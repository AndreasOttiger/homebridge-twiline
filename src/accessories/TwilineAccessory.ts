import { TwilineMessage } from '../platform/signal';

export interface TwilineAccessory {
    readonly reference: string;
    readonly name: string;
    handleMessage(message: TwilineMessage): void;
}