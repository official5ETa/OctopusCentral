import { Setting as SettingInterface, SettingsObjectType, SettingValueType, SettingValueTypeType } from '@octopuscentral/types';
import EventEmitter from 'node:events';
import { Instance } from '.';
import { Setting } from './Setting';
export declare class Settings extends EventEmitter {
    private readonly instance;
    private settings;
    constructor(instance: Instance);
    initDatabase(): Promise<void>;
    init(): Promise<void>;
    initDefaultSettings(settings?: SettingInterface[] | SettingsObjectType): Promise<void>;
    private loadSettings;
    fetchSettings(): Promise<Setting[]>;
    getAvgSettingNumValue(name: string): Promise<number | undefined>;
    private getSettingId;
    getSetting(name: string): Setting | undefined;
    getSettingValue(name: string): SettingValueType | undefined;
    getSettingStrValue(name: string): string | null | undefined;
    getSettingNumValue(name: string): number | null | undefined;
    getSettingBolValue(name: string): boolean | null | undefined;
    getSettingStrValueF(name: string): string;
    getSettingNumValueF(name: string): number;
    getSettingBolValueF(name: string): boolean;
    updateSetting(setting: Setting | string, settingValue?: SettingValueType, settingType?: SettingValueTypeType, settingMin?: number, settingMax?: number, overwrite?: boolean): Promise<Setting>;
    deleteSetting(setting: Setting | string): Promise<void>;
}
