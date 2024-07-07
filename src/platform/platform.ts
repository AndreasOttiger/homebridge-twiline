import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from '../settings.js';
import { TwilinePlatformAccessory } from './platformAccessory.js';
import { SupportedAccessories } from './const.js';
import { TcpClient } from './TcpClient.js';
import { LightAccessory } from '../accessories/LightAccessory.js';
import { SignalType, TwilineMessage } from './signal.js';
import { TwilineAccessory } from '../accessories/TwilineAccessory.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TwilineHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public twilineClient: TcpClient;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public readonly twilineAccessories: TwilineAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      // TODO aufraeumen
      this.log.warn('Clearing the cache...');
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
      this.accessories.length = 0;

      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });

    this.twilineClient = new TcpClient(this.config.twiline_ip, this.config.twiline_port, log);

    this.twilineClient.on('connected', () => {
      log.info('Successfully connected to the server');
    });

    this.twilineClient.on('data', (data: string) => {
      const jsonStrings: string[] = data.split('\n').map(str => str.trim());
      jsonStrings.forEach(jsonString => {
        if (jsonString.length === 0) {
          return;
        }
        try {
          const message: TwilineMessage = JSON.parse(jsonString);
          // Cast the type to the enum
          message.signal.type = message.signal.type as SignalType;
          log.debug(`Message from sender: ${message.signal.sender} of type ${message.signal.type}`);
          if (message.signal.sender === undefined) {
            throw new Error('Sender in message not defined.');
          }
          const accessory = this.twilineAccessories.find(accessory => accessory.reference === message.signal.sender);
          if (accessory === undefined) {
            this.log.info(`Accessory reference ${message.signal.sender} is configured in TWILINE but not in the plugin.`);
          } else {
            this.log.debug(`found message for accessory ${accessory.reference}`);
            accessory.handleMessage(message);
          }
        } catch (error) {
          log.error(`Failed parsing JSON "${data}"`);
        }
      });
    });

  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    const devices: { twilineReference: string; twilineName: string; accessoryType: SupportedAccessories} [] = [];

    for (const device of this.config.lightSwitches) {
      devices.push({twilineReference: device.reference, twilineName: device.name, accessoryType: SupportedAccessories.Light});
    }
    for (const device of this.config.scenes) {  // eslint-disable-line @typescript-eslint/no-unused-vars
      //devices.push({twilineReference: device.reference, twilineName: device.name, accessoryType: SupportedAccessories.Scene});
    }

    // clear the cache ... somehow... whatever TODO

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of devices) {
      // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
      // existingAccessory.context.device = device;

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.twilineReference);
      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        if (device.accessoryType === SupportedAccessories.Light) {
          this.twilineAccessories.push(new LightAccessory(
            this,
            existingAccessory,
            device.twilineReference,
            device.twilineName,
            this.twilineClient));
        } else {
          new TwilinePlatformAccessory(this, existingAccessory);
        }

        // TODO development - so notwendig?
        // this.log.debug('updating accessories', existingAccessory.displayName);
        // this.api.updatePlatformAccessories([existingAccessory]);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.twilineReference, device.twilineName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.twilineReference, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        if (device.accessoryType === SupportedAccessories.Light) {
          this.twilineAccessories.push(new LightAccessory(
            this,
            accessory,
            device.twilineReference,
            device.twilineName,
            this.twilineClient));
        } else {
          new TwilinePlatformAccessory(this, accessory);
        }

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      }
    }
  }
}
