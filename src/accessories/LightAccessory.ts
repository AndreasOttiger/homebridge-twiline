import {
  PlatformAccessory,
  Characteristic,  // eslint-disable-line @typescript-eslint/no-unused-vars
  Service,
  CharacteristicGetCallback,
  CharacteristicValue,
  CharacteristicSetCallback } from 'homebridge';
import { TwilineHomebridgePlatform } from '../platform/platform.js';
import { TcpClient } from '../platform/TcpClient.js';
import { SignalType, TwilineMessage } from '../platform/signal.js';
import { TwilineAccessory } from './TwilineAccessory.js';

export class LightAccessory implements TwilineAccessory {
  private readonly service: Service;
  private states = {
    On: false,
  };

  constructor(
    private readonly platform: TwilineHomebridgePlatform, // Annahme: Beispielplattformklasse
    private readonly accessory: PlatformAccessory,
    public readonly reference: string,
    public readonly name: string,
    private readonly twilineClient: TcpClient,
  ) {
    // Erstellen des Lampen-Service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    // Konfiguration der Eigenschaften der Lampe
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on('get', this.getOn.bind(this))
      .on('set', this.setOn.bind(this));

    // Weitere Eigenschaften und Events konfigurieren
  }

  handleMessage(message: TwilineMessage): void {
    if (message.signal.type === SignalType.On) {
      this.states.On = true;
    } else if (message.signal.type === SignalType.Off) {
      this.states.On = false;
    }
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.states.On);
  }

  private getOn(callback: CharacteristicGetCallback) {
    const twilineMessage = new TwilineMessage.Builder()
      .setType(SignalType.SendMeState)
      .setReceiver(this.reference)
      .build();
    this.twilineClient.write(JSON.stringify(twilineMessage));
    callback(null, this.states.On);
  }

  private setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    // Logik zum Setzen des Zustands der Lampe
    /*
    */
    this.states.On = value as boolean;
    let signalType : SignalType;
    if (this.states.On) {
      signalType = SignalType.On;
    } else {
      signalType = SignalType.Off;
    }
    const twilineMessage = new TwilineMessage.Builder().setType(signalType).setReceiver(this.reference).build();
    const jsonString = JSON.stringify(twilineMessage);
    //    this.twilineClient.write(`{"signal":{"type": "TOGGLE","receiver": "${this.reference}"}}`);
    this.twilineClient.write(jsonString);
    callback(null, this.states.On); // Beispiel: Zustand erfolgreich gesetzt
  }
}