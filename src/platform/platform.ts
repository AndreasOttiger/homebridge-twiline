import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from '../settings.js';
import { SupportedAccessories } from './const.js';
import { TcpClient } from './TcpClient.js';
import { Signal, SignalType, TwilineMessage } from './signal.js';
import { TwilineAccessory } from '../accessories/TwilineAccessory.js';
import { LightAccessory } from '../accessories/LightAccessory.js';
import { StatelessSwitchAccessory } from '../accessories/StatelessSwitchAccessory.js';
import { SceneAccessory } from '../accessories/SceneAccessory.js';
import { WindowAccessory } from '../accessories/WindowAccessory.js';
import { BlindAccessory } from '../accessories/BlindAccessory.js';

class Device {
  public readonly uuid: string;
  constructor
  (
    public readonly twilineReference: string,
    public readonly twilineName: string,
    public readonly accessoryType: SupportedAccessories,
    api: API,
  ) {
    // generate a unique id for the accessory this should be generated from
    // something globally unique, but constant, for example, the device serial
    // number or MAC address
    this.uuid = api.hap.uuid.generate(this.twilineReference);
  }
}

export class TwilineHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly twilineClient: TcpClient;


  /**
   * used to track restored cached accessories; after initialization it contains all accessories
   */
  public readonly accessories: PlatformAccessory[] = [];
  /**
   * all TwilineAccessory handlers. We need them to pass messages to them.
   */
  public readonly twilineAccessories: TwilineAccessory[] = [];
  private readonly configuredDevices: Device[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.configuredDevices = this.readConfiguredDevices();
    if (!this.validateDevicesConfiguration(this.configuredDevices)) {
      // in case of an invalid configuration we don't stop homebridge from loading but only the plugin
      this.twilineClient = { on: () => {} } as unknown as TcpClient;
      return;
    }

    this.log.debug('Finished initializing TWILINE platform.');

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', this.handleFinishLaunching);

    this.twilineClient = new TcpClient(this.config.twiline_ip, this.config.twiline_port, log);
    this.twilineClient.on('connected', () => {
      this.log.info('Successfully connected to the server');
    });
    this.twilineClient.on('data', this.handleTcpData);
  }

  /**
   * called after launching the platform and with that after restoring all cached accessories
   *
   * the new accessories are registered from here.
   */
  readonly handleFinishLaunching = () => {
    this.log.debug('Executed didFinishLaunching callback');

    // TODO cleanup. Should not be there. Haven't found a way of proper handling of cached accessories yet.
    // solution: remove all accessories which have not been found in the configuration again.
    // this.log.warn('Clearing the cache...');
    // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
    // this.accessories.length = 0;

    // run the method to discover / register your devices as accessories
    this.discoverDevices();
  };

  /**
   * handles all data received from TWILINE
   * @param data the data received from TWILINE
   */
  readonly handleTcpData = (data: string) => {
    const jsonStrings: string[] = data.split('\n').map(str => str.trim());
    jsonStrings.forEach(jsonString => {
      if (jsonString.length === 0) {
        return;
      }
      try {
        const message: TwilineMessage = JSON.parse(jsonString);
        if (message.error !== undefined) {
          // Error handling
          this.log.error('TWILINE error:', message.error.message);
        }
        if (message.signal !== undefined) {
          const signal: Signal = message.signal;
          signal.type = signal.type as SignalType;
          this.log.debug(`Message from sender: ${signal.sender} of type ${signal.type}`);
          if (signal.sender === undefined) {
            throw new Error('Sender in message not defined.');
          }
          const accessory = this.twilineAccessories.find(accessory => accessory.reference === signal.sender);
          if (accessory === undefined) {
            this.log.info(`Accessory reference ${signal.sender} is configured in TWILINE but not in the plugin.`);
          } else {
            accessory.handleSignal(signal);
          }
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.log.error(`JSON parsing error for '${jsonString}':`, error.message);
        } else {
          this.log.error(`Unexpected error for '${jsonString}':`, error);
        }
      }
    });
  };

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    // do nothing... we don't need to initialize accessories or similar.

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * reads the configured devices
   * @returns an array of devices containing the information from the configuration
   */
  readConfiguredDevices(): Device[] {
    const devices: Device[] = [];

    // Define mappings for different device types
    const deviceMappings = [
      { configKey: 'lightSwitches', accessoryType: SupportedAccessories.Light },
      { configKey: 'switches', accessoryType: SupportedAccessories.Switch },
      { configKey: 'scenes', accessoryType: SupportedAccessories.Scene },
      { configKey: 'blinds', accessoryType: SupportedAccessories.Blind },
      { configKey: 'windows', accessoryType: SupportedAccessories.Window },
    ];

    // Iterate over each mapping and corresponding configuration
    deviceMappings.forEach(mapping => {
      const configDevices = this.config[mapping.configKey];
      if (configDevices && configDevices.length > 0) {
        configDevices.forEach((configDevice: { reference: string; name: string }) => {
          devices.push(new Device(configDevice.reference, configDevice.name, mapping.accessoryType, this.api));
          this.log.debug(
            `Read device from config. Reference ${configDevice.reference}, Name ${configDevice.name}, type ${mapping.configKey}`,
          );
        });
      }
    });

    return devices;
  }

  /**
   * validates the configuration
   * - every reference is set
   * - no reference is used twice
   * @param devices the configured devices to be validated
   */
  validateDevicesConfiguration(devices: Device[]): boolean {
    let valid : boolean = true;
    const references = new Set<string>();
    devices.forEach((device: Device) => {
      if (!device.twilineReference) {
        this.log.error('Invalid configuration: a device has an empty \'reference\'.');
        valid = false;
      }

      if (references.has(device.twilineReference)) {
        this.log.error(`Invalid configuration: duplicate reference '${device.twilineReference}' found.`);
        valid = false;
      }

      references.add(device.twilineReference);
    });
    return valid;
  }

  /**
   * create the accessories and the handlers. Do that by collecting from the configuration   *
   */
  discoverDevices() {
    this.removeAccessoriesNoLongerConfigured();

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.configuredDevices) {
      // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
      // existingAccessory.context.device = device;

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === device.uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // create the accessory handler for the restored accessory
        this.twilineAccessories.push(
          this.createAccessoryHandler(
            this,
            existingAccessory,
            device.twilineReference,
            device.twilineName,
            device.accessoryType,
            this.twilineClient),
        );
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.twilineReference, device.twilineName);
        const accessory = new this.api.platformAccessory(device.twilineReference, device.uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        this.twilineAccessories.push(
          this.createAccessoryHandler(
            this,
            accessory,
            device.twilineReference,
            device.twilineName,
            device.accessoryType,
            this.twilineClient),
        );

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      }
    }
  }

  /**
   * Loops through the list of accessories restored from cache and unregisters them if no corresponding
   * configuration is found.
   */
  removeAccessoriesNoLongerConfigured() {
    for (const accessory of this.accessories) {
      const configuredAccessory = this.configuredDevices.find(device => device.uuid === accessory.UUID);

      if (configuredAccessory) {
        // update
      } else {
        this.log.info('Removing accessory not longer in use: ', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  /**
   * Creates the handler for an accessory which is registered for the accessory.
   * The new handler is registered to the accessory.
   * @param platform
   * @param accessory the accessory the handler is registered to
   * @param reference TWILINE reference
   * @param name display name
   * @param accessoryType the type of the TWILINE accessory
   * @param twilineClient
   * @returns the created handler
   */
  createAccessoryHandler(
    platform: TwilineHomebridgePlatform,
    accessory: PlatformAccessory,
    reference: string,
    name: string,
    accessoryType: SupportedAccessories,
    twilineClient: TcpClient,
  ): TwilineAccessory {
    let twilineAccessory : TwilineAccessory;
    switch(accessoryType) {
      case SupportedAccessories.Light:
        twilineAccessory = new LightAccessory(
          platform,
          accessory,
          reference,
          name,
          twilineClient);
        break;
      case SupportedAccessories.Switch:
        twilineAccessory = new StatelessSwitchAccessory(
          platform,
          accessory,
          reference,
          name,
          twilineClient);
        break;
      case SupportedAccessories.Scene:
        twilineAccessory = new SceneAccessory(
          platform,
          accessory,
          reference,
          name,
          twilineClient);
        break;
      case SupportedAccessories.Blind:
        twilineAccessory = new BlindAccessory(
          platform,
          accessory,
          reference,
          name,
          twilineClient);
        break;
      case SupportedAccessories.Window:
        twilineAccessory = new WindowAccessory(
          platform,
          accessory,
          reference,
          name,
          twilineClient);
        break;
      default:
        throw new Error('Unknown accessory type.');
    }
    return twilineAccessory;
  }
}
