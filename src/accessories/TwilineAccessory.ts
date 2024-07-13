import { PlatformAccessory } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TwilineMessage } from '../platform/signal.js';
import { TcpClient } from '../platform/TcpClient.js';

/**
 * The interface common for all TWILINE accessories.
 */
export abstract class TwilineAccessory {
  constructor (
    protected readonly platform: TwilineHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
    readonly reference: string,
    readonly name: string,
    protected readonly twilineClient: TcpClient,
  ) {

  }

  /**
   * When the platform receives a message for an accessory it will be passed to the accessory
   * by this method. Mostly it will contain state information that can be used to update the
   * state of an accessory.
   *
   * @param message the received message as an object, created from the JSON
   */
  abstract handleMessage(message: TwilineMessage): void;

  /**
   * Removes obsolete services. This happens if a reference to a TWILINE item was changed
   * to a different accessory type.
   * @param serviceUUID the UUID of the service type
   */
  removeObsoleteServices(serviceUUID: string) {
    this.accessory.services.forEach(service => {
      if (service.UUID !== serviceUUID && service.UUID !== this.platform.Service.AccessoryInformation.UUID) {
        this.accessory.removeService(service);
      }
    });
  }



}