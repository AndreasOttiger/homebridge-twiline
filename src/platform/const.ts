export enum SupportedAccessories {
    Light,
    Switch,
    Scene,
    Blind,
    Window
}

export const RECONNECT_DELAY = 5000; // reconnect delay of the socket in ms
export const SWITCH_PRESS_DURATION = 500; // duration a switch press is simulated
export const TWILINE_MESSAGE_PROCESSING_TIME = 50; // ms, time to wait before sending the next message out