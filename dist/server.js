"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_poweredup_1 = __importDefault(require("node-poweredup"));
const poweredUP = new node_poweredup_1.default();
poweredUP.on('discover', async (hub) => {
    console.log(`Discovered ${hub.name}:`, hub.ports);
    await hub.connect();
    console.log(`Connected to ${hub.name}`);
});
poweredUP.scan();
//# sourceMappingURL=server.js.map