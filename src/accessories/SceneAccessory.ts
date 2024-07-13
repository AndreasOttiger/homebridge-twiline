import {
  PlatformAccessory,
  Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { SignalType } from '../platform/signal.js';
import { LightAccessory } from './LightAccessory.js';

export class SceneAccessory extends LightAccessory {
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
    return this.platform.Service.Switch.UUID;
  }

  /**
   * @override
   */
  protected getSignalToSend(value: boolean) :SignalType {
    if (value) {
      return SignalType.SceneShow;
    } else {
      return SignalType.SceneToggle;
    }
  }
}
