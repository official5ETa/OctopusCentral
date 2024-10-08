import EventEmitter from 'node:events';
import crypto from 'node:crypto';
import { io, Socket as IOSocket } from 'socket.io-client';
import { Instance } from './Instance';
import { DockerClientProps, DockerInstanceProps, Setting } from '@octopuscentral/types';

export class Controller extends EventEmitter {
  readonly id: number;

  socketHost?: string;

  #socket?: IOSocket;

  get socket(): IOSocket | undefined { return this.#socket }

  get connected(): boolean { return !!this.#socket }

  constructor(id: number, socketHost?: string) {
    super();
    this.id = id;
    this.socketHost = socketHost;
  }

  async connect(reconnect: boolean = false): Promise<boolean> {
    if (!this.socketHost)
      return false;
    if (this.connected && reconnect)
      this.disconnect();

    const socket = io(this.socketHost, {
      reconnection: true,
      reconnectionAttempts: Infinity
    });
    this.#socket = socket;

    if (!await new Promise<boolean>((resolve => {
      socket.once('connect', () => {
        this.emit('socket connect');
        resolve(true);
      });
      socket.once('connect_error', error => {
        this.emit('socket connect_error', error);
        resolve(false);
      });
    }))) {
      this.disconnect();
      return false;
    }
    return true;
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = undefined;
    }
  }

  async _request(command: string, args?: any): Promise<{ code: number, data: any } | undefined> {
    if (!this.connected) return;
    const sessionId: string = crypto.randomBytes(16).toString('hex').toUpperCase();
    this.#socket!.emit('request controller', sessionId, command, args);
    return await this.listenForResponse(sessionId);
  }

  private listenForResponse(sessionId: string): Promise<{ code: number, data: any }> {
    return new Promise(resolve => {
      if (!this.connected)
        resolve({ code: 408, data: undefined });
      else this.#socket!.once('response controller', async (code: number, _sessionId: string, data: any) =>
        resolve(
          _sessionId === sessionId
            ? { code, data }
            : await this.listenForResponse(sessionId)
        ));
    });
  }

  async _requestData(command: string, args?: any): Promise<any | undefined> {
    const response = await this._request(command, args);
    return !response || response.code !== 200 ? undefined : response.data;
  }

  async getServiceName(): Promise<string | undefined> {
    return await this._requestData('get serviceName');
  }

  async getInstances(): Promise<Instance[] | undefined> {
    const instances: { id: number }[] | undefined = await this._requestData('get instances', { values: ['id'] });
    return instances?.map(({ id }) => new Instance(this, id));
  }

  async fetchInstances(): Promise<true | undefined> {
    return (await this._request('fetch instances'))?.code === 200 ? true : undefined
  }

  async createInstance(): Promise<Instance> {
    const result = await this._requestData('create instance');
    return new Instance(this, result.id);
  }

  async updateInstanceSettings(instance: Instance, settings: Setting[]): Promise<boolean> {
    return await this._requestData('update instance settings', { id: instance.id, settings });
  }

  async dockerGetClientProps(): Promise<DockerClientProps> {
    return await this._requestData('docker get clientProps');
  }

  async dockerGetInstanceProps(): Promise<DockerInstanceProps> {
    return await this._requestData('docker get instanceProps');
  }

  async dockerStartInstance(instance: Instance): Promise<boolean> {
    return await this._requestData('docker start instance', { id: instance.id });
  }

  async dockerStopInstance(instance: Instance): Promise<boolean> {
    return await this._requestData('docker stop instance', { id: instance.id });
  }

  async dockerPauseInstance(instance: Instance): Promise<boolean> {
    return await this._requestData('docker pause instance', { id: instance.id });
  }

  async dockerUnpauseInstance(instance: Instance): Promise<boolean> {
    return await this._requestData('docker unpause instance', { id: instance.id });
  }

  async dockerInstancePaused(instance: Instance): Promise<boolean | undefined> {
    return await this._requestData('docker instance paused', { id: instance.id });
  }
}