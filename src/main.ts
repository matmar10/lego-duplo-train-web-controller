import Promise from 'bluebird';
import express from 'express';
import { join } from 'path';
import { Server } from 'ws';

import { doDeviceAction, poweredUP, spinner } from './train';

spinner.start('Starting up...');

const PORT = process.env.PORT || 3000;

const server = express()
  .use(express.static(join(__dirname, '/../public')))
  .listen(PORT, () => {
    spinner.info(`API listening on ${PORT}`);
    spinner.start('Scanning for Hubs...');
    poweredUP.scan();
  });

const wss = new Server({ server });
wss.on('connection', (ws) => {
  spinner.succeed('Client connected');
  ws.on('close', () => {
    spinner.warn('Client disconnected');
  });

  // { "type": "device", "name": "motor", "method": "setPower", "args": [50]}
  ws.on('message', async function incoming(data) {
    const parsed = JSON.parse(data.toString());
    if (Array.isArray(parsed)) {
      await Promise.each(parsed, async (req) => {
        switch (req.type) {
          case 'device':
            const message = `Device action: ${req.name}.${req.method}(${req.args.join(',')})`;
            spinner.info(message);
            try {
              await doDeviceAction(req);
              spinner.succeed(message);
            } catch (err) {
              spinner.fail(`${message} - ${err}`);
            }
        }
      });
    }
    spinner.start('Listening for instructions...');
  });
});
