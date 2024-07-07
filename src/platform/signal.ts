export enum SignalType {
    On = 'ON',
    Off = 'OFF',
    Toggle = 'TOGGLE',
    DimmerStart = 'DIMMER_START',
    DimmerStop = 'DIMMER_STOP',
    BlindsStart = 'BLINDS_START',
    BlindsStop = 'BLINDS_STOP',
    BlindsPosition = 'BLINDS_POSITION',
    ValueSet = 'VALUE_SET',
    SceneShow = 'SCENE_SHOW',
    SceneToggle = 'SCENE_TOGGLE',
    SendMeState = 'SEND_ME_STATE',
    RmLedState = 'RMLED_STATE',
    SceneAdjusting = 'SCENE_ADJUSTING',
    SceneSave = 'SCENE_SAVE'
}

export class Signal {
  type: SignalType;
  receiver?: string;
  sender?: string;

  constructor(type: SignalType) {
    this.type = type;
  }
}

export class TwilineMessage {
  signal: Signal;

  constructor(signal: Signal) {
    this.signal = signal;
  }

  static Builder = class {
    type: SignalType | undefined;
    receiver: string | undefined;

    setType(type: SignalType): this {
      this.type = type;
      return this;
    }

    setReceiver(receiver: string): this {
      this.receiver = receiver;
      return this;
    }

    build(): TwilineMessage {
      if (this.type === undefined) {
        throw new Error('Type is required');
      }
      const signal = new Signal(this.type);
      if (this.receiver !== undefined) {
        signal.receiver = this.receiver;
      }
      return new TwilineMessage(signal);
    }
  };
}