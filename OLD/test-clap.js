
const PoweredUP = require('node-poweredup');
const ClapDetector = require('clap-detector').default;

const clap = new ClapDetector();
const poweredUP = new PoweredUP.PoweredUP();

poweredUP.on('discover', async (hub) => {
  console.log(`Discovered ${hub.name}:`, hub.ports);
  await hub.connect();
  console.log(`Connected to ${hub.name}`);

  console.log('Waiting for motor...');
  const motor = await hub.waitForDeviceAtPort('MOTOR');
  console.log(' > motor is ready.');

  console.log('Waiting for color sensor...');
  const colorSensor = await hub.waitForDeviceAtPort('COLOR');
  console.log(' > color sensor is ready.');

  const speaker = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER);
  console.log('  > speaker ready');

  clap.addClapsListener(async claps => {
    await speaker.playTone(1);
    motor.setPower(50);
  }, { number: 1, delay: 1000 });
  clap.addClapsListener(async claps => {
    await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.BRAKE);
    motor.setPower(-50);
  }, { number: 2, delay: 1000 });
});

poweredUP.scan(); // Start scanning for Hubs
