import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';
import { TcpClient } from '../platform/TcpClient.js';

export class StatelessSwitchAccessory implements TwilineAccessory {
  private readonly service: Service;

  constructor(
        private readonly platform: TwilineHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        public readonly reference: string,
        public readonly name: string,
        private readonly twilineClient: TcpClient,
  ) {

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.handleSwitchSet.bind(this))
      .on('get', this.handleSwitchGet.bind(this));
  }

  /**
     * as it is stateless there's nothing to trigger here.
     * @param message will not be used
     */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleMessage(message: TwilineMessage): void {
    // do nothing, a status for a switch does not make sense (even though TWILINE sends them)
    if (message.signal.type === SignalType.On) {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
    } else if (message.signal.type === SignalType.Off) {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
    }
  }

  handleSwitchGet(callback: CharacteristicGetCallback) {
    callback(null, false);
  }

  /**
     * Handle requests to get the current value of the "Programmable Switch Event" characteristic
     */
  handleSwitchSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if (value) {
      let twilineMessage = new TwilineMessage.Builder().setType(SignalType.On).setReceiver(this.reference).build();
      let jsonString = JSON.stringify(twilineMessage);
      this.twilineClient.write(jsonString);
      setTimeout(() => {
        twilineMessage = new TwilineMessage.Builder().setType(SignalType.Off).setReceiver(this.reference).build();
        jsonString = JSON.stringify(twilineMessage);
        this.twilineClient.write(jsonString);
      }, 500);
    }
    callback(null);
  }


}