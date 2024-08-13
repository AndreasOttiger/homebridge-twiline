import * as net from 'net';
import { EventEmitter } from 'events';
import { RECONNECT_DELAY, TWILINE_MESSAGE_PROCESSING_TIME } from './const.js';
import { Logging } from 'homebridge';

export class TcpClient extends EventEmitter {
  private client: net.Socket;
  private reconnectDelay: number = RECONNECT_DELAY;
  private messageQueue: string[] = [];
  private isProcessingQueue: boolean = false;

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
      this.log.info(`Connected to ${this.host}:${this.port}`);
      this.emit('connected');
    });

    this.client.on('data', (data: Buffer) => {
      this.log.debug('Received data:', data.toString().trim());
      this.emit('data', data.toString().trim());
    });

    this.client.on('error', (err: Error) => {
      this.log.error('Socket error:', err);
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

  /**
   * Writes a message to the server, but rate-limited to one message every 50ms.
   * @param message The message to send to the server.
   */
  public write(message: string): void {
    this.messageQueue.push(message);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  public close(): void {
    this.client.destroy();
  }

  /**
   * Processes the message queue, sending one message every 50ms.
   */
  private processQueue(): void {
    this.isProcessingQueue = true;

    const sendNextMessage = () => {
      if (this.messageQueue.length > 0) {
        const nextMessage = this.messageQueue.shift();
        if (nextMessage) {
          this.log.debug('Write data:', nextMessage);
          this.client.write(nextMessage);
        }
        setTimeout(sendNextMessage, TWILINE_MESSAGE_PROCESSING_TIME); // Wait 50ms before sending the next message
      } else {
        this.isProcessingQueue = false; // Stop processing if queue is empty
      }
    };

    sendNextMessage();
  }
}

