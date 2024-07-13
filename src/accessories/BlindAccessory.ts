import {
  PlatformAccessory,
  Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { WindowAccessory } from './WindowAccessory.js';

export class BlindAccessory extends WindowAccessory {
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
    return this.platform.Service.WindowCovering.UUID;
  }

  /**
   * @override
   */
  protected addService(name : string): Service {
    const service = this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering);

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
   * @override
   */
  protected getInverted(): boolean {
    return true;
  }
}
