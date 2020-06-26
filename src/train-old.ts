
import Bottleneck from 'bottleneck';
import PoweredUP, {
  Consts,
  Device,
  DuploTrainBase,
  DuploTrainBaseColorSensor
} from 'node-poweredup';
import ora from 'ora';

import {
  ColorEmoji,
  TileColorValues,
  TileName
} from './lib/color';

// export const spinner = ora();


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
  name: 'speed',
  id: 'DUPLO_TRAIN_BASE_SPEEDOMETER'
}];

export const NUMBER_OF_DEVICES = Object.keys(devicesList).length;

async function delay(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Train {

  public devices: DevicesMap = {};
  private _isConnected = false;

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

  private async readyDevices(): Promise<void> {
    if (this.isDevicesReady) {
      return;
    }
    this.devices['hub'] = this.hub;
    await Promise.all(devicesList.map(async (device: DeviceNameToType) => {
      const type: Consts.DeviceType = (<any>Consts.DeviceType)[device.id];
      this.devices[device.name] = await this.devices.hub.waitForDeviceByType(type);
    }));
  }
}


// { "type": "device", "name": "motor", "method": "setPower", "args": [50]}
// export async function doDeviceAction(req: DeviceAction): Promise<any> {
//   const device = devices[req.name];
//   if (!device) {
//     throw new Error(`No device: ${req.name}`);
//   }
//   const method = device[req.method];
//   if (!method) {
//     throw new Error(`Device '${req.name}' has no method '${req.method}'`);
//   }
//   await method.apply(device, req.args);
//   await devices.hub.sleep(1000);
// }

// export interface DeviceListenerMap {
//   [key: string]: Function[]
// }
//
// export interface ListenerMap {
//   [key: string]: DeviceListenerMap
// }
//
// const listeners: ListenerMap = {};
// export async function listenDeviceEvent(deviceName: string, event: string, fn: Function) {
//   const device = devices[deviceName];
//   if (!device) {
//     throw new Error(`No device: ${deviceName}`);
//   }
//   listeners[deviceName] = listeners[deviceName] || {};
//   listeners[deviceName][event] = listeners[deviceName][event] || [];
//   listeners[deviceName][event].push(fn);
//
//   bindListener(deviceName, listeners[deviceName]);
// }
//
// function bindListener(deviceName: string, listenerMap: DeviceListenerMap) {
//   const device = devices[deviceName];
//   if (!device) {
//     return;
//   }
//   const events = Object.keys(listenerMap);
//   events.forEach(eventName => {
//     const listenersForEvent = listenerMap[eventName];
//     device.on(eventName, (ev: any) => {
//       listenersForEvent.forEach((listener: Function) => listener({
//         type: eventName,
//         data: ev
//       }));
//     });
//   });
// }
//
// function bindListeners(devicesObj: DevicesMap, listenersMap: ListenerMap) {
//   const devicesList = Object.keys(devicesObj);
//   devicesList.forEach((deviceName) => {
//     if (!listeners[deviceName]) {
//       return;
//     }
//     const listenersForDevice = listenersMap[deviceName];
//     bindListener(deviceName, listenersForDevice);
//   });
// }

// speedometer.on('speed', function(ev) {
//   const speed = ev.speed;
//   console.log('Speed:', speed);
// });

// const checkColorLimiter = new Bottleneck({
//   maxConcurrent: 1,
//   highWater: 0,
//   minTime: 0
// });
// const triggerTileLimiter = new Bottleneck({
//   maxConcurrent: 1,
//   highWater: 0,
//   minTime: 300
// });

// let consecutiveScans: { [key: string]: number } = {};
// const MIN_TILE_SCANS = 1;
// function isScanSignificant(tileName: string) {
//   consecutiveScans[tileName] = consecutiveScans[tileName] || 0;
//   consecutiveScans[tileName]++;
//   const keys = Object.keys(consecutiveScans);
//   if (keys.length > 1) {
//     consecutiveScans = {};
//     return false;
//   }
//   return consecutiveScans[tileName] >= MIN_TILE_SCANS;
// }

// poweredUP.on('discover', async (hub: DuploTrainBase) => {
//   devices.hub = hub;
//   spinner.succeed(`Discovered ${devices.hub.name}`);
//
//   spinner.start(`Connecting to ${devices.hub.name}`);
//   await devices.hub.connect();
//   spinner.succeed(`Connected to ${devices.hub.name}`);
//
//   const devicesList: DeviceNameToType[] = [{
//     name: 'color',
//     id: 'DUPLO_TRAIN_BASE_COLOR_SENSOR',
//   }, {
//     name: 'motor',
//     id: 'DUPLO_TRAIN_BASE_MOTOR',
//   }, {
//     name: 'speaker',
//     id: 'DUPLO_TRAIN_BASE_SPEAKER',
//   }, {
//     name: 'led',
//     id: 'HUB_LED',
//   }, {
//     name: 'speed',
//     id: 'DUPLO_TRAIN_BASE_SPEEDOMETER'
//   }];
//
//   await Promise.all(devicesList.map(async (device: DeviceNameToType) => {
//     spinner.start(`Waiting for device '${device.name}' (${device.id})...`);
//     const type: Consts.DeviceType = (<any>Consts.DeviceType)[device.id];
//     devices[device.name] = await devices.hub.waitForDeviceByType(type);
//     spinner.succeed(`Device ready: '${device.name}' (${device.id})`);
//   }));
//   await devices.speaker.playTone(7);

  // const checkColor = checkColorLimiter.wrap(async (ev: any) => {
  //   try {
  //     // spinner.info(`RGB(${ev.red}, ${ev.green}, ${ev.blue})`);
  //     const tileName = TileName.getTileName(ev);
  //     if (tileName) {
  //       if (isScanSignificant(tileName)) {
  //         const emoji = ColorEmoji[tileName];
  //         await triggerTile(tileName, emoji);
  //       }
  //     } else {
  //       // console.log(ev);
  //     }
  //   } catch (err) { }
  // });
  // const triggerTile = triggerTileLimiter.wrap(async (tileName: string, emoji: string) => {
  //   spinner.info(`${emoji} ${tileName} tile passed`);
  //   const color = TileColorValues[tileName];
  //   devices.led.setRGB(color.red, color.green, color.blue);
  // });
  // devices.color.on('rgb', async (ev: any) => {
  //   try {
  //     await checkColor({
  //       red: Math.round(ev.red / 2),
  //       green: Math.round(ev.green / 2),
  //       blue: Math.round(ev.blue / 2),
  //     });
  //   } catch (err) { }
  // });
// });

const spinner = ora();

const pUP = new PoweredUP();
pUP.on('discover', async (hub: DuploTrainBase) => {
  spinner.succeed('Discovered Hub');
  spinner.start('Connecting train & devices...');
  const train = new Train(hub, pUP);
  await train.ready();
  spinner.succeed('Connected train & devices OK!');
  await train.action({
    type: 'device',
    name: 'speaker',
    method: 'playTone',
    args: [2]
  });
  await delay(1000);
  await train.action({
    type: 'device',
    name: 'speaker',
    method: 'playTone',
    args: [3]
  });
});
pUP.scan();
spinner.start('Scanning for Hubs...');
