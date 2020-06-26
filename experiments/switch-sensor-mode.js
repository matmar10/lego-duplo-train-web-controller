'use strict';

const PoweredUP = require('node-poweredup');
const Bottleneck = require('bottleneck');

const poweredUP = new PoweredUP.PoweredUP();

async function delay(ms) {
  new Promise((resolve) => setTimeout(resolve, ms));
}

poweredUP.on('discover', async (hub) => {
  if (!(hub instanceof PoweredUP.DuploTrainBase)) {
    console.log('Discovered hub: unknown type');
    return;
  }
  console.log('Discovered hub: DuploTrainBase');

  setInterval(() => {
    const devices = hub.getDevices();
    console.log(devices);
  }, 1000);

  // const deviceType = 'DUPLO_TRAIN_BASE_COLOR_SENSOR';
  // console.log(` > Waiting for device: ${deviceType}`)
  // const colorSensor = await hub.waitForDeviceAtPort('COLOR');
  // console.log(' > color sensor is ready.');

  let currentMode;
  let currentCallback;
  function setMode(mode, callback) {
    console.log(`Changing to mode: ${mode}`);
    if (currentMode && currentCallback) {
      colorSensor.off(currentMode, currentCallback);
    }
    currentMode = mode;
    currentCallback = callback;
    colorSensor.on(currentMode, currentCallback);
  }

  const fn = function(ev) {
    console.log(ev);
  };
  setMode('color', fn);
  await delay(2000);
  setMode('reflect', fn);
  await delay(2000);
  setMode('color', fn);
  await delay(2000);
  await delay(2000);
  setMode('reflect', fn);
});

poweredUP.scan();
console.log('Scanning for Hubs...');
