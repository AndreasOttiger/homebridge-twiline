import {
  PlatformAccessory,
  Service,
  CharacteristicGetCallback,
  CharacteristicValue,
  CharacteristicSetCallback } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { Command, MotorState, Signal, SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';

export class WindowAccessory extends TwilineAccessory {
  private readonly service: Service;
  private currentPosition: number = 0;
  private targetPosition: number = 0;
  private motorState: MotorState = MotorState.MotorStopped;

  constructor(
    protected readonly platform: TwilineHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
    public readonly reference: string,
    public readonly name: string,
    protected readonly twilineClient: TcpClient,
  ) {
    super(platform, accessory, reference, name, twilineClient);

    this.removeObsoleteServices(platform.Service.Window.UUID);

    this.service = this.accessory.getService(this.platform.Service.Window) ||
      this.accessory.addService(this.platform.Service.Window);

    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .on('get', this.getCurrentPosition.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .on('get', this.getPositionState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .on('get', this.getTargetPosition.bind(this))
      .on('set', this.handleTargetPositionSet.bind(this));

  }

  /**
   * Translates the motor state reported by TWILINE to a position state.
   * Note: as a fully open window is 100%, opening a window has a motor
   * moving down, but a position state increasing.
   */
  getPositionStateFromMotorState(motor: MotorState) : number {
    switch (motor) {
      case MotorState.MotorStopped:
        return this.platform.Characteristic.PositionState.STOPPED;
      case MotorState.MotorMovingUp:
        return this.platform.Characteristic.PositionState.DECREASING;
      case MotorState.MotorMovingDown:
      case MotorState.MotorMovingDown2:
        return this.platform.Characteristic.PositionState.INCREASING;
      default:
        // Handle unexpected motorState values
        throw new Error('MotorState unknown', motor);
    }
  }

  handleSignal(signal: Signal): void {
    if (signal.type === SignalType.BlindsPosition) {
      if (signal.position !== undefined) {
        this.currentPosition = signal.position;
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(signal.position);
      }

      if (signal.motor !== undefined) {
        this.motorState = signal.motor;
        this.service.getCharacteristic(
          this.platform.Characteristic.PositionState).updateValue(this.getPositionStateFromMotorState(signal.motor),
        );
      }
    }
  }

  private handleTargetPositionSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.targetPosition = value as number;
    let twilineMessage;
    if (this.targetPosition !== this.currentPosition) {
      twilineMessage = new TwilineMessage.Builder()
        .setType(SignalType.BlindsStart)
        .setReceiver(this.reference)
        .setCommand(Command.DriveToPositionCommand)
        .setEndPosition(this.targetPosition)
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

  private getCurrentPosition(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.currentPosition);
  }

  private getTargetPosition(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.targetPosition);
  }

  private getPositionState(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.getPositionStateFromMotorState(this.motorState));
  }

}
