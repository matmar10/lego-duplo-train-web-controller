
import PoweredUP, {
  Consts,
  DuploTrainBase,
} from 'node-poweredup';

export interface DevicesMap { [key: string]: any }

export interface DeviceAction {
  type: string,
  name: string,
  method: string,
  args: any[]
}

export interface DeviceNameToType {
  name: string,
  id: string,
}

export const devicesList: DeviceNameToType[] = [{
  name: 'color',
  id: 'DUPLO_TRAIN_BASE_COLOR_SENSOR',
}, {
  name: 'motor',
  id: 'DUPLO_TRAIN_BASE_MOTOR',
}, {
  name: 'speaker',
  id: 'DUPLO_TRAIN_BASE_SPEAKER',
}, {
  name: 'led',
  id: 'HUB_LED',
}, {
  name: 'speedometer',
  id: 'DUPLO_TRAIN_BASE_SPEEDOMETER'
}];

export const NUMBER_OF_DEVICES = Object.keys(devicesList).length;

export interface KeyValueStore {
  [key: string]: any;
}

export interface DeviceListenerMap {
  [device: string]: {
    [event: string]: Function
  }
}

export class Train {

  public devices: DevicesMap = {};
  private _isConnected = false;
  private _state: KeyValueStore = {};
  private _listeners: DeviceListenerMap = {};

  constructor(
    public hub: DuploTrainBase,
    public poweredUP: PoweredUP
  ) { }

  get isConnected() {
    return this._isConnected;
  }

  set isConnected(isConnected) {
    throw new Error('Not allowed');
  }

  get isDevicesReady() {
    return Object.keys(this.devices).length === NUMBER_OF_DEVICES + 1;
  }

  set isDevicesReady(isDevicesReady) {
    throw new Error('Not allowed');
  }

  public setState(key: string, val: any) {
    this._state[key] = val;
  }

  public getState(key: string): any {
    return this._state[key];
  }

  public async action(req: DeviceAction[]|DeviceAction) {
    if (Array.isArray(req)) {
      return Promise.all(req.map(async reqItem => {
        await this.action(reqItem);
      }));
    }
    if ('device' === req.type) {
      const device = this.devices[req.name];
      if (!device) {
        throw new Error(`No device: ${req.name}`);
      }
      const method = device[req.method];
      if (!method) {
        throw new Error(`Device '${req.name}' has no method '${req.method}'`);
      }
      await method.apply(device, req.args);
      return;
    }
    throw new Error(`Type: ${req.type} not supported`);
  }

  public async ready(): Promise<void> {
    if (!this._isConnected) {
      await this.hub.connect();
      this._isConnected = true;
    }
    await this.readyDevices();
  }

  public on(device: string, event: string, fn: Function) {
    this.off(device, event);
    this.devices[device].on(event, fn);
    this._listeners[device][event] = fn;
  }

  public off(device: string, event: string) {
    const hardwareDevice = this.devices[device];
    if (!hardwareDevice) {
      throw new Error(`Invalid device: ${device}`);
    }
    const fn: Function = this._listeners[device][event];
    if (fn) {
      hardwareDevice.off(event, fn);
      return;
    }
  }

  private async readyDevices(): Promise<void> {
    if (this.isDevicesReady) {
      return;
    }
    this.devices['hub'] = this.hub;
    await Promise.all(devicesList.map(async (device: DeviceNameToType) => {
      const type: Consts.DeviceType = (<any>Consts.DeviceType)[device.id];
      this.devices[device.name] = await this.devices.hub.waitForDeviceByType(type);
    }));
    Object.keys(this.devices).forEach(deviceName => this._listeners[deviceName] = {});
  }
}
