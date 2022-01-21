import minimist from "minimist";
import { NstrumentaClient } from "nstrumenta";
import ws from "ws";

import Cli from "./Cli";

const argv = minimist(process.argv.slice(2));
const wsUrl = argv.wsUrl;
const apiKey = argv.apiKey;
if (!wsUrl) {
  console.log("Missing argument '--wsUrl'.\nUsage: '$npm start -- --wsUrl=ws://localhost:8088 --apiKey=xxx-xxx-xxx");
  process.exit();
} else if (!apiKey) {
  console.log("Missing argument '--apiKey'.\nUsage: '$npm start -- --wsUrl=ws://localhost:8088 --apiKey=xxx-xxx-xxx");
  process.exit();
}

const nstClient = new NstrumentaClient({ apiKey, wsUrl });
nstClient.addListener("open", () => {
  const cli = new Cli((bytes) => {
    nstClient.sendBuffer("trax-in", bytes);
  });

  nstClient.subscribe("serialport-events", (message) => {
    console.log("serialport-events", message);
    switch (message.type) {
      case "open":
        console.log("Opened");
        break;
      default:
        break;
    }
  });

  nstClient.subscribe("trax2", (message) => {
    if (typeof message === "object" && message.data) {
      cli.handleResponse(new Uint8Array(message.data));
    }
  });

  cli.debug = true;
  cli.start();
});

nstClient.init(ws as any);
