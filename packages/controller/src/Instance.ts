import EventEmitter from 'node:events';
import { io, Socket as IOSocket } from 'socket.io-client';
import { sleep, waitFor } from './helper';

export class Instance extends EventEmitter {
  readonly id: number;

  socketProtocol: string = 'http';
  socketHostname?: string;
  socketPort: number;

  #socket?: IOSocket;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  constructor(id: number, socketHostname?: string, socketPort: number = 1777) {
    super();
    this.id = id;
    this.socketHostname = socketHostname;
    this.socketPort = socketPort;
  }

  async connect(reconnect: boolean = false): Promise<boolean | Error> {
    if (!this.socketProtocol || !this.socketHostname || !this.socketPort)
      return false;
    if (this.connected && reconnect)
      this.disconnect();

    const socket = io(`${this.socketProtocol}://${this.socketHostname}:${this.socketPort}`, {
      reconnection: true,
      reconnectionAttempts: Infinity
    });
    this.#socket = socket;

    const connectResult = await new Promise<Error | void>((resolve => {
      socket.once('connect', () => {
        this.emit('socket connected');
        resolve();
      });
      socket.once('connect_error', error => {
        this.emit('socket connect_error', error);
        resolve(error);
      });
    }))

    if (connectResult instanceof Error) {
      this.#socket = undefined;
      return connectResult;
    }

    this.#socket!.on('boot status',        message => this.emit('boot status',        message));
    this.#socket!.on('boot status booted', success => this.emit('boot status booted', success));

    return true;
  }

  async sendStartPermission(timeout: number = 6e4): Promise<boolean> {
    let result: boolean | undefined = undefined;

    const self = this;
    await Promise.all([
      waitFor(() => {
        self.socket?.emit('start permission');
        return result;
      }, timeout / 200),

      Promise.race([
        await waitFor(() => {
          if (this.connected) {
            self.socket!.once('start permission received', () => result = true);
            return true;
          }
        }, timeout / 200),

        sleep(timeout).then(() => result = false)
      ])
    ]);

    return result!;
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = undefined;
      this.emit('socket disconnected');
    }
  }
}