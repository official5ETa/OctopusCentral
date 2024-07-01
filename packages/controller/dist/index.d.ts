import { DockerInstanceProps } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import { Socket } from './Socket';
import { Docker } from './Docker';
import { Connection } from 'mysql2';
import { Instance } from './Instance';
export declare class Controller extends EventEmitter {
    #private;
    readonly table: string;
    readonly serviceName: string;
    instancesFetchInterval: number;
    readonly database: Connection;
    readonly docker: Docker;
    readonly socket: Socket;
    get instances(): Instance[];
    get running(): boolean;
    constructor(serviceName: string, database: Connection, instanceDockerProps: DockerInstanceProps);
    addInstance(instance: Instance, overwrite?: boolean): void;
    private addAndSetupInstance;
    getInstance(id: number): Instance | undefined;
    removeInstance(instance: Instance): void;
    private loadInstances;
    fetchSyncInstances(): Promise<Instance[]>;
    updateInstanceSocketHostname(instance: Instance, socketHostname: string, autoReconnect?: boolean): Promise<void>;
    connectInstances(): Promise<void>;
    start(): Promise<void>;
    private runInterval;
}
