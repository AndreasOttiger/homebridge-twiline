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
    SceneSave = 'SCENE_SAVE',
    SceneInfo = 'SCENE_INFO'
}

export enum MotorState {
  MotorStopped = 0,
  MotorMovingUp = 1,
  MotorMovingDown = 2,
  MotorMovingDown2 = 3
}

export enum Command {
  DriveUpCommand = 1,             // Fahrbefehl AUF(a)
  DriveDownCommand = 2,           // Fahrbefehl AB(a)
  DriveDown2Command = 3,          // Fahrbefehl AB2(a)(x)
  ButtonPressUpCommand = 4,       // Tastbefehl AUF(b)
  ButtonPressDownCommand = 5,     // Tastbefehl AB(b)
  ButtonPressDown2Command = 6,    // Tastbefehl AB2(b)(x)
  DriveToPositionCommand = 7,     // Fahrbefehl auf Position(c)
  SingleButtonUpDownControl = 8,  // Eintastbedienung AUF <> AB(d)
  OpenSlatsCommand = 9,           // Lamellen öffnen (ohne Fahren) (e)
  CloseSlatsCommand = 10          // Lamellen schliessen (ohne Fahren) (e)
}

export class Signal {
  type: SignalType;
  receiver?: string;
  sender?: string;
  position?: number;       // 0-100 as percentage
  motor?: MotorState;
  command?: Command;
  endPosition?: number;    // 0-100 as percentage
  runTime?: number;        // in seconds, TODO not used/implemented
  reverseImpulse?: number; // in seconds, TODO not used/implemented
  shadesAngle?: number;    // in degrees, TODO not used/implemented

  constructor(type: SignalType) {
    this.type = type;
  }
}

export class Error {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export class TwilineMessage {
  signal?: Signal;
  error?: Error;


  static Builder = class {
    type: SignalType | undefined;
    receiver: string | undefined;
    command: Command | undefined;
    endPosition: number | undefined;

    setType(type: SignalType): this {
      this.type = type;
      return this;
    }

    setReceiver(receiver: string): this {
      this.receiver = receiver;
      return this;
    }

    setCommand(command: Command): this {
      this.command = command;
      return this;
    }

    setEndPosition(endPosition: number): this {
      this.endPosition = endPosition;
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
      if (this.command !== undefined) {
        signal.command = this.command;
      }
      if (this.endPosition !== undefined) {
        signal.endPosition = this.endPosition;
      }
      const message: TwilineMessage = new TwilineMessage();
      message.signal = signal;
      return message;
    }
  };
}