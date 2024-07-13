import {
  PlatformAccessory,
  Service,
  CharacteristicGetCallback,
  CharacteristicValue,
  CharacteristicSetCallback} from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { Command, MotorState, Signal, SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';

export class WindowAccessory extends TwilineAccessory {
  protected currentPosition: number = 0;
  protected targetPosition: number = 0;
  protected motorState: MotorState = MotorState.MotorStopped;
  /**
   * inverted = false: 100% is open, 0% is closed.
   */
  protected readonly inverted = this.getInverted();


  constructor(
    protected readonly platform: TwilineHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
    public readonly reference: string,
    public readonly name: string,
    protected readonly twilineClient: TcpClient,
  ) {
    super(platform, accessory, reference, name, twilineClient);
  }

  /**
   * @override
   */
  protected getServiceUUID(): string {
    return this.platform.Service.Window.UUID;
  }

  /**
   * @override
   */
  protected addService(name : string): Service {
    const service = this.accessory.getService(this.platform.Service.Window) ||
      this.accessory.addService(this.platform.Service.Window);

    service.setCharacteristic(this.platform.Characteristic.Name, name);

    service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .on('get', this.getCurrentPosition.bind(this));

    service.getCharacteristic(this.platform.Characteristic.PositionState)
      .on('get', this.getPositionState.bind(this));

    service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .on('get', this.getTargetPosition.bind(this))
      .on('set', this.handleTargetPositionSet.bind(this));

    return service;
  }

  /**
   * Translates the motor state reported by TWILINE to a position state.
   * Note:
   * - standard: as a fully open window is 100%, opening a window has a motor
   * moving down, but a position state increasing.
   *  - inverted: the motor moving up means retracting the blinds, opening the view.
   *  As HomeKit reflects this as 100%, it is therefore increasing.
   */
  protected getPositionStateFromMotorState(motor: MotorState) : number {
    switch (motor) {
      case MotorState.MotorStopped:
        return this.platform.Characteristic.PositionState.STOPPED;
      case MotorState.MotorMovingUp:
        return this.inverted ?
          this.platform.Characteristic.PositionState.INCREASING :
          this.platform.Characteristic.PositionState.DECREASING;
      case MotorState.MotorMovingDown:
      case MotorState.MotorMovingDown2:
        return this.inverted ?
          this.platform.Characteristic.PositionState.DECREASING :
          this.platform.Characteristic.PositionState.INCREASING;
      default:
        // Handle unexpected motorState values
        throw new Error('MotorState unknown', motor);
    }
  }

  /**
   * @override
   */
  handleSignal(signal: Signal): void {
    if (signal.type === SignalType.BlindsPosition) {
      if (signal.position !== undefined) {
        this.currentPosition = this.inverted ? 100 - signal.position : signal.position;
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPosition);
      }

      if (signal.motor !== undefined) {
        this.motorState = signal.motor;
        this.service.getCharacteristic(
          this.platform.Characteristic.PositionState).updateValue(this.getPositionStateFromMotorState(signal.motor),
        );
      }
    }
  }

  protected handleTargetPositionSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.targetPosition = value as number;
    let twilineMessage;
    if (this.targetPosition !== this.currentPosition) {
      twilineMessage = new TwilineMessage.Builder()
        .setType(SignalType.BlindsStart)
        .setReceiver(this.reference)
        .setCommand(Command.DriveToPositionCommand)
        .setEndPosition(this.inverted ? 100 - (this.targetPosition as number) : this.targetPosition)
        .build();
    } else {
      twilineMessage = new TwilineMessage.Builder()
        .setType(SignalType.BlindsStop)
        .setReceiver(this.reference)
        .build();
    }

    const jsonString = JSON.stringify(twilineMessage);
    this.twilineClient.write(jsonString);
    callback(null);
  }

  protected getCurrentPosition(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.currentPosition);
  }

  protected getTargetPosition(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.targetPosition);
  }

  protected getPositionState(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.getPositionStateFromMotorState(this.motorState));
  }

  /**
   * inverted = false: 100% is open, 0% is closed.
   */
  protected getInverted(): boolean {
    return false;
  }
}



