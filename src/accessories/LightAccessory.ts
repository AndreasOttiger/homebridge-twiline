import {
  PlatformAccessory,
  Service,
  CharacteristicGetCallback,
  CharacteristicValue,
  CharacteristicSetCallback } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { Signal, SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';

export class LightAccessory extends TwilineAccessory {
  protected states = {
    On: false,
  };

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
  protected addService(name: string): Service {
    const service = this.accessory.getService(this.platform.Service.Lightbulb) ||
    this.accessory.addService(this.platform.Service.Lightbulb);

    service.setCharacteristic(this.platform.Characteristic.Name, name);

    service
      .getCharacteristic(this.platform.Characteristic.On)
      .on('get', this.getOn.bind(this))
      .on('set', this.setOn.bind(this));

    return service;
  }

  /**
   * @override
   */
  protected getServiceUUID(): string {
    return this.platform.Service.Lightbulb.UUID;
  }

  /**
   * @override
   */
  handleSignal(signal: Signal): void {
    if (signal.type === SignalType.On) {
      this.states.On = true;
    } else if (signal.type === SignalType.Off) {
      this.states.On = false;
    }
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.states.On);
  }

  protected getOn(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.states.On);
  }

  protected getSignalToSend(value: boolean) :SignalType {
    if (value) {
      return SignalType.On;
    } else {
      return SignalType.Off;
    }
  }

  protected setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.states.On = value as boolean;
    const twilineMessage = new TwilineMessage.Builder().setType(this.getSignalToSend(this.states.On)).setReceiver(this.reference).build();
    const jsonString = JSON.stringify(twilineMessage);
    this.twilineClient.write(jsonString);
    callback(null);
  }
}
