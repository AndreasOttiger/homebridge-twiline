import { PlatformAccessory, Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { Signal } from '../platform/signal.js';
import { TcpClient } from '../platform/TcpClient.js';
/**
 * The interface common for all TWILINE accessories.
 */
export abstract class TwilineAccessory {
  protected readonly service: Service;

  constructor (
    protected readonly platform: TwilineHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
    readonly reference: string,
    readonly name: string,
    protected readonly twilineClient: TcpClient,
  ) {
    this.removeObsoleteServices();
    this.service = this.addService(name);
  }

  /**
   * Adds a service to the accessory.
   * @param name name of the service
   */
  protected abstract addService(name: string): Service;
  protected abstract getServiceUUID(): string;
  /**
   * When the platform receives a signal for an accessory it will be passed to the accessory
   * by this method. Mostly it will contain state information that can be used to update the
   * state of an accessory.
   *
   * @param signal the received signal as an object, created from the JSON
   */
  abstract handleSignal(signal: Signal): void;

  /**
   * Removes obsolete services. This happens if a reference to a TWILINE item was changed
   * to a different accessory type.
   * @param serviceUUID the UUID of the service type
   */
  removeObsoleteServices() {
    this.accessory.services.forEach(service => {
      if (service.UUID !== this.getServiceUUID() && service.UUID !== this.platform.Service.AccessoryInformation.UUID) {
        this.accessory.removeService(service);
      }
    });
  }



}