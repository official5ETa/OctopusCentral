"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const types_1 = require("@octopuscentral/types");
const node_events_1 = __importDefault(require("node:events"));
const Setting_1 = require("./Setting");
class Settings extends node_events_1.default {
    constructor(instance) {
        super();
        this.settings = [];
        this.instance = instance;
    }
    initDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.instance.database.connection.query(`
        CREATE TABLE IF NOT EXISTS ${types_1.instanceSettingsTableName} (
          id          INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
          instance_id INT UNSIGNED NOT NULL,
          name        VARCHAR(255) NOT NULL,
          value       TEXT         NOT NULL DEFAULT '',
          type        CHAR(3)      NOT NULL,
          min         INT UNSIGNED     NULL,
          max         INT UNSIGNED     NULL,
          FOREIGN KEY (instance_id) REFERENCES ${types_1.instancesTableName} (id),
          UNIQUE INDEX instance_setting (instance_id, name)
        )
      `);
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initDatabase();
            yield this.fetchSettings();
        });
    }
    initDefaultSettings() {
        return __awaiter(this, arguments, void 0, function* (settings = {}) {
            yield this.fetchSettings();
            if (!Array.isArray(settings) && typeof settings === 'object')
                settings = Object.keys(settings).map(key => ({
                    name: key,
                    value: settings[key]
                }));
            for (const setting of settings)
                yield this.updateSetting(setting.name, setting.value, setting.type, setting.min, setting.max, false);
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return (_a = (yield this.instance.database.connection.execute(`
        SELECT name, value, type, min, max
        FROM ${types_1.instanceSettingsTableName}
        WHERE instance_id = ?`, [this.instance.id]))) === null || _a === void 0 ? void 0 : _a.map(({ name, value, type, min, max }) => new Setting_1.Setting(name, value, type, min, max));
        });
    }
    fetchSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.settings = yield this.loadSettings();
        });
    }
    getAvgSettingNumValue(name) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield this.fetchSettings();
            if (!this.getSetting(name))
                return undefined;
            return (_a = (yield this.instance.database.connection.execute(`
      SELECT AVG(CAST(? AS DECIMAL(20, 5))) AS value
      FROM ${types_1.instanceSettingsTableName}
    `, [name]))[0]) === null || _a === void 0 ? void 0 : _a.value;
        });
    }
    getSettingId(name) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return (_a = (yield this.instance.database.connection.execute(`
        SELECT id
        FROM ${types_1.instanceSettingsTableName}
        WHERE instance_id = ?
        AND name = ?`, [this.instance.id, name]))[0]) === null || _a === void 0 ? void 0 : _a.id;
        });
    }
    getSetting(name) {
        const setting = this.settings.find(setting => setting.name === name);
        this.emit('setting get', setting);
        return setting;
    }
    getSettingValue(name) {
        var _a;
        return (_a = this.getSetting(name)) === null || _a === void 0 ? void 0 : _a.value;
    }
    getSettingStrValue(name) {
        const setting = this.getSetting(name);
        return setting instanceof Setting_1.Setting
            ? (setting.type === 'nul' ? null : String(setting.value))
            : undefined;
    }
    getSettingNumValue(name) {
        const setting = this.getSetting(name);
        if (!(setting instanceof Setting_1.Setting))
            return undefined;
        if (setting.type === 'nul')
            return null;
        const value = Number(setting.value);
        return isNaN(value) ? undefined : value;
    }
    getSettingBolValue(name) {
        const setting = this.getSetting(name);
        return setting instanceof Setting_1.Setting
            ? (setting.type === 'nul' ? null
                : (setting.type === 'bol' ? setting.value
                    : undefined))
            : undefined;
    }
    updateSetting(setting_1, settingValue_1, settingType_1, settingMin_1, settingMax_1) {
        return __awaiter(this, arguments, void 0, function* (setting, settingValue, settingType, settingMin, settingMax, overwrite = true) {
            let thisSetting;
            if (setting instanceof Setting_1.Setting)
                thisSetting = setting;
            else if (typeof setting === 'string' && settingValue !== undefined) {
                const loadedSetting = this.getSetting(setting);
                thisSetting = new Setting_1.Setting(setting, settingValue, settingType, settingMin === undefined ? loadedSetting === null || loadedSetting === void 0 ? void 0 : loadedSetting.min : settingMin, settingMax === undefined ? loadedSetting === null || loadedSetting === void 0 ? void 0 : loadedSetting.max : settingMax);
            }
            else
                throw new Error('invalid params');
            const settingId = yield this.getSettingId(thisSetting.name);
            if (settingId && overwrite)
                yield this.instance.database.connection.execute(`
          UPDATE ${types_1.instanceSettingsTableName}
          SET instance_id = ?, name = ?, value = ?, type = ?, min = ?, max = ?
          WHERE id = ?
        `, [this.instance.id, thisSetting.name, thisSetting.valueString, thisSetting.type, thisSetting.min, thisSetting.max, settingId]);
            else if (settingId === undefined)
                yield this.instance.database.connection.execute(`
          INSERT INTO ${types_1.instanceSettingsTableName} (instance_id, name, value, type, min, max)
          VALUES (?, ?, ?, ?, ?, ?)`, [this.instance.id, thisSetting.name, thisSetting.valueString, thisSetting.type, thisSetting.min, thisSetting.max]);
            const settingsIndex = this.settings.findIndex(_setting => _setting.name === thisSetting.name);
            if (settingsIndex === -1)
                this.settings.push(thisSetting);
            else if (overwrite)
                this.settings[settingsIndex] = thisSetting;
            this.emit('setting update', thisSetting);
            return thisSetting;
        });
    }
    deleteSetting(setting) {
        return __awaiter(this, void 0, void 0, function* () {
            const settingName = setting instanceof Setting_1.Setting ? setting.name : setting;
            yield this.instance.database.connection.execute(`DELETE FROM ${types_1.instanceSettingsTableName} WHERE instance_id = ? AND name = ?`, [this.instance.id, settingName]);
            this.settings = this.settings.filter(({ name }) => name !== settingName);
            this.emit('setting delete', settingName);
        });
    }
    // aliases
    g(name) { return this.getSetting(name); }
    gS(name) { return this.getSettingStrValue(name); }
    gN(name) { return this.getSettingNumValue(name); }
    gB(name) { return this.getSettingBolValue(name); }
    u(setting_1, settingValue_1, settingType_1, settingMin_1, settingMax_1) {
        return __awaiter(this, arguments, void 0, function* (setting, settingValue, settingType, settingMin, settingMax, overwrite = true) {
            return yield this.updateSetting(setting, settingValue, settingType, settingMin, settingMax, overwrite);
        });
    }
    d(setting) {
        return __awaiter(this, void 0, void 0, function* () { return yield this.deleteSetting(setting); });
    }
}
exports.Settings = Settings;
//# sourceMappingURL=Settings.js.map