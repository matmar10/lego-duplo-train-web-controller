
// import Bottleneck from 'bottleneck';
import PoweredUP, { DuploTrainBase } from 'node-poweredup';
import ora from 'ora';

import { layout } from './layouts/loop-with-siding';
import { ColorEmoji } from './lib/color';
import { Train } from './train';

const pUP = new PoweredUP();
const spinner = ora();
pUP.on('discover', async (hub: DuploTrainBase) => {
  spinner.succeed('Discovered Hub');
  spinner.start('Connecting train & devices...');
  const train = new Train(hub, pUP);
  await train.ready();
  spinner.succeed('Connected train & devices OK!');

  // TODO: file bug report on this
  // const COLOR = 0x00;
  // const REFLECTIVITY = 0x02;
  // const RGB = 0x03;
  // train.devices.color.subscribe(REFLECTIVITY);
  // await delay(2000);
  // train.devices.color.subscribe(RGB);
  // await delay(2000);
  // train.devices.color.subscribe(REFLECTIVITY);
  // await delay(2000);
  // train.devices.color.subscribe(RGB);

  // train.devices.color.on('rgb', (ev) => {
  //   console.log(ev.red + ev.green + ev.blue);
  // });


  layout.on('*', function (eventName: string, data: any) {
    const machina = data.client.__machina__['duplo-train-layout'];
    const { priorState, state } = machina;
    if ('transition' === eventName) {
      spinner.info(`${priorState} ➡️ ${state}`);
      spinner.start(`🚂 ${state}...`);
    }
    if ('tile' === data.inputType && 'handled' === eventName) {
      const tileName = machina.currentActionArgs[1];
      const emoji = ColorEmoji[tileName];
      setTimeout(() => {
        let msg: string;
        if ('handled' === eventName) {
          const count = train.getState('loopCount') || 0;
          msg = `${emoji} ${tileName} passed (count: ${count})`;
          spinner.succeed(msg);
          spinner.start(`In state: ${state}...`);
        }
      }, 200);
    }
    if ('finishedLoops' === data.inputType && 'handled' === eventName) {
      spinner.succeed(`🏁 finished loop.`);
      spinner.start(`🔙 Backing into siding..`);
    }
  });

  // layout.on('tile', function (eventName: string, tileName: string) {
  //   const emoji = ColorEmoji[tileName];
  //   const count = train.getState('loopCount') || 0;
  //   spinner.succeed(`${emoji} ${tileName} passed ${count} times`);
  // });
  layout.start(train);
});
pUP.scan();
spinner.start('Scanning for Hubs...');
