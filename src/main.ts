
import Bottleneck from 'bottleneck';
import PoweredUP, { DuploTrainBase } from 'node-poweredup';
import ora from 'ora';

import { layout } from './layouts/loop-with-siding';
import {
  ColorEmoji,
  TileColorValues,
  TileName
} from './lib/color';
import { delay } from './lib/delay';
import { Train } from './train';

const checkColorLimiter = new Bottleneck({
  maxConcurrent: 1,
  highWater: 0,
  minTime: 0
});
const triggerTileLimiter = new Bottleneck({
  maxConcurrent: 1,
  highWater: 0,
  minTime: 300
});

const pUP = new PoweredUP();
const spinner = ora();
pUP.on('discover', async (hub: DuploTrainBase) => {
  spinner.succeed('Discovered Hub');
  spinner.start('Connecting train & devices...');
  const train = new Train(hub, pUP);
  await train.ready();
  spinner.succeed('Connected train & devices OK!');

  const notifyReflect = (ev: any) => {
    console.log(ev);
    layout.reflect(train, ev.reflect);
  };
  const notifySpeed = (ev: any) => {
    console.log(ev);
    layout.speed(train, ev.speed);
  };

  layout.on('*', function (eventName: string, data: any) {
    const { priorState, state } = data.client.__machina__['duplo-train-layout'];
    if ('transition' === eventName) {
      console.log({
        priorState,
        state
      });
    }
  });

  layout.start(train);
  train.on('speed', 'speed', notifySpeed);
  train.on('color', 'reflect', notifyReflect);
});
pUP.scan();
spinner.start('Scanning for Hubs...');
