import * as net from 'net';
import { EventEmitter } from 'events';
import { RECONNECT_DELAY } from './const.js';
import { Logging } from 'homebridge';

export class TcpClient extends EventEmitter {
  private client: net.Socket;
  private reconnectDelay: number = RECONNECT_DELAY; // 2 seconds

  constructor(
    private readonly host: string,
    private readonly port: number,
    public readonly log: Logging,
  ) {
    super();
    this.host = host;
    this.port = port;
    this.client = new net.Socket();

    this.setupConnection();
  }

  /**
    * creates connection to the server and sets the event handler
    */
  private setupConnection(): void {
    this.client.connect(this.port, this.host, () => {
      this.log.info('Connected to', this.host, this.port);
      this.emit('connected');
    });

    this.client.on('data', (data: Buffer) => {
      this.log.debug('Received data:', data.toString());
      this.emit('data', data.toString());
    });

    this.client.on('error', (err: Error) => {
      this.log.error('Socket error:', err);
      //      this.reconnect();
    });

    this.client.on('close', () => {
      this.log.info('Connection closed');
      this.reconnect();
    });
  }

  private reconnect(): void {
    this.log.info('Attempting to reconnect in', this.reconnectDelay / 1000, 'seconds');
    setTimeout(() => {
      this.client.destroy(); // Destroy the old socket
      this.client = new net.Socket(); // Create a new socket
      this.log.info('Attempting to reconnect...');
      this.setupConnection(); // Try to reconnect
    }, this.reconnectDelay);
  }

  public write(message: string): void {
    this.client.write(message);
  }

  public close(): void {
    this.client.destroy();
  }
}

