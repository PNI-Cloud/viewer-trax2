# TRAX2 Interactive CLI

## Usage

This implementation assumes you are using Nstrumenta and will be communicating with only 1 TRAX2 unit.

You will first need a WebSocket url. You can either get one for Nstrumenta's website, or host it yourself. This will assume you are hosting it yourself.

To host it, start a terminal session. Run these commands:

```sh
# One time only
npm i -g nstrumenta
nstrumenta auth add # Set projectId and API key found on https://nstrumenta.com/
nstrumenta context set-property wsHost --value ws://localhost:8088

nstrumenta serve
```

Next, start a second terminal. This one will be responsible for communicating with the TRAX2 and Nstrumenta using serial port. Run these commands:

```sh
cd path/to/viewer-trax2/trax2-serialport
npm start --  --wsUrl=ws://localhost:8088 --apiKey=xxxxx-xxxx-xxx
```

Lastly, start a third terminal. This one will run the interAactive CLI application.

```sh
npm start --  --wsUrl=ws://localhost:8088 --apiKey=xxx-xxx-xxx
```

Assuming everything connects, a "shell" called "trax2" will be shown.
To test it, send this command:

```sh
kGetModInfo
```

This should reply with something like `GetModInfo: 'TRX2 M034'.`. If you see that, then everything is working as expected.

To view available commands, enter the command `help`.
