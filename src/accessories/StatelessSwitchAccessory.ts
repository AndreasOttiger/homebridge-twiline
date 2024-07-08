import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';
import { TcpClient } from '../platform/TcpClient.js';
import { SWITCH_PRESS_DURATION } from '../platform/const.js';

export class StatelessSwitchAccessory implements TwilineAccessory {
  private readonly service: Service;

  constructor(
        private readonly platform: TwilineHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        public readonly reference: string,
        public readonly name: string,
        private readonly twilineClient: TcpClient,
  ) {

    // it maps to the Switch-Accessory, haven't found a better solution
    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.handleSwitchSet.bind(this))
      .on('get', this.handleSwitchGet.bind(this));
  }

  handleMessage(message: TwilineMessage): void {
    if (message.signal.type === SignalType.On) {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
    } else if (message.signal.type === SignalType.Off) {
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