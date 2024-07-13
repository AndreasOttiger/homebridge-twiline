import {
  PlatformAccessory,
  Service,
  CharacteristicGetCallback,
  CharacteristicValue,
  CharacteristicSetCallback } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';

export class WindowAccessory extends TwilineAccessory {
  private readonly service: Service;
  private states = {
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

    this.removeObsoleteServices(platform.Service.Window.UUID);

    this.service = this.accessory.getService(this.platform.Service.Window) ||
      this.accessory.addService(this.platform.Service.Window);

    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .on('get', this.get.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .on('get', this.get.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .on('get', this.get.bind(this))
      .on('set', this.handleTargetPositionSet.bind(this));

  }

  handleMessage(message: TwilineMessage): void {
    if (message.signal.type === SignalType.On) {
      this.states.On = true;
    } else if (message.signal.type === SignalType.Off) {
      this.states.On = false;
    }
    // TBD
    // this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.states.On);
  }

  private handleTargetPositionSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.states.On = value as boolean;
    let signalType : SignalType;
    if (this.states.On) {
      signalType = SignalType.On;
    } else {
      signalType = SignalType.Off;
    }
    const twilineMessage = new TwilineMessage.Builder().setType(signalType).setReceiver(this.reference).build();
    const jsonString = JSON.stringify(twilineMessage);
    this.twilineClient.write(jsonString);
    callback(null, this.states.On);
  }

  private get(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.states.On);
  }

}
