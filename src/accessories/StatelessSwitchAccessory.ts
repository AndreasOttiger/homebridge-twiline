import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { Signal, SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';
import { TcpClient } from '../platform/TcpClient.js';
import { SWITCH_PRESS_DURATION } from '../platform/const.js';

export class StatelessSwitchAccessory extends TwilineAccessory {
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
    const service = this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    service.setCharacteristic(this.platform.Characteristic.Name, name);

    service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.handleSwitchSet.bind(this))
      .on('get', this.handleSwitchGet.bind(this));

    return service;
  }

  /**
   * @override
   */
  protected getServiceUUID(): string {
    return this.platform.Service.Switch.UUID;
  }

  /**
   * @override
   */
  handleSignal(signal: Signal): void {
    if (signal.type === SignalType.On) {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
    } else if (signal.type === SignalType.Off) {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
    }
  }

  handleSwitchGet(callback: CharacteristicGetCallback) {
    callback(null, false);
  }

  handleSwitchSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if (value) {
      let twilineMessage = new TwilineMessage.Builder().setType(SignalType.On).setReceiver(this.reference).build();
      let jsonString = JSON.stringify(twilineMessage);
      this.twilineClient.write(jsonString);
      setTimeout(() => {
        twilineMessage = new TwilineMessage.Builder().setType(SignalType.Off).setReceiver(this.reference).build();
        jsonString = JSON.stringify(twilineMessage);
        this.twilineClient.write(jsonString);
      }, SWITCH_PRESS_DURATION);
    }
    callback(null);
  }


}