import readline from "readline";

import Commander from "commander";

import { Encoder } from "../../core/src/Encoder";
import { Decoder } from "../../core/src/Decoder";
import * as Protocol from "../../core/src/Protocol";

// This doesn't hook into Nstrumenta yet. That is TODO.
export default class Cli {
  isStarted = false;
  debug = false;

  private rl: readline.Interface;
  private encoder = new Encoder();
  private decoder = new Decoder();
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private program: Commander.Command;
  private curretCommand = "";
  private promptOpen = false;
  private requestHandler: (bytes: Uint8Array) => void;

  constructor(requestHandler: (bytes: Uint8Array) => void) {
    this.requestHandler = requestHandler;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.program = new Commander.Command("trax2");
    this.program.name("trax2 %");
    this.program.usage("[command] [args]");

    const cmds: Commander.Command[] = [this.program];

    cmds.push(this.program.command(Commands.kGetModInfo)
      .description("Queries the device's type and firmware revision.")
      .action(() => this.getModuleInfo()));

    cmds.push(this.program.command(Commands.kSetDataComponents)
      .description(`Sets the data components to be output.\n- Run '${Commands.kSetDataComponents} -h' to view available components.`)
      .usage("<Components...>")
      .argument("<Components...>", "List of data components to be enabled in TRAX2.")
      .addHelpText("after", helpExampleText(`${Commands.kSetDataComponents} ${Components.kHeading} ${Components.kPitch} ${Components.kRoll}`))
      .addHelpText("after", helpListToText("Available 'Component' values", [
        makeHelpListItem(Components.kHeading, "Compass heading, range [0 ̊, 360 ̊)."),
        makeHelpListItem(Components.kPitch, "Compass Pitch, range [-90 ̊, 90 ̊]."),
        makeHelpListItem(Components.kRoll, "Compass Roll, range [-180 ̊, 180 ̊]."),
        makeHelpListItem(Components.kHeadingStatus, "Indication of the uncertainty of the heading.\n- Value '1' represents a heading uncertainty of <2°.\n- Value '2' means the heading uncertainty is approximately 2° to 10°.\n- Value '3' means the uncertainty is >10°."),
        makeHelpListItem(Components.kQuaternion, "The quaternions are output as Q0, Q1, Q2, and Q3, where Q3 is the scalar quaternion."),
        makeHelpListItem(Components.kTemperature, "The device's internal temperature sensor. Its value is in degrees Celsius and has an accuracy of ±3° C."),
        makeHelpListItem(Components.kDistortion, "This flag indicates at least one magnetometer axis reading is beyond ±125 μT.\n- It is only applicable in Compass Mode, and will always read “FALSE” in AHRS Mode."),
        makeHelpListItem(Components.kCalStatus, "This flag indicates the user calibration status.\n- False means it is not user calibrated and this is the default value."),
        makeHelpListItem(Components.kAccelX, "Accelerometer X axis (g)."),
        makeHelpListItem(Components.kAccelY, "Accelerometer Y axis (g)."),
        makeHelpListItem(Components.kAccelZ, "Accelerometer Z axis (g)."),
        makeHelpListItem(Components.kMagX, "Magnetometer X axis (μT)."),
        makeHelpListItem(Components.kMagY, "Magnetometer Y axis (μT)."),
        makeHelpListItem(Components.kMagZ, "Magnetometer Z axis (μT)."),
        makeHelpListItem(Components.kGyroX, "Gyroscope X axis (radians per second)."),
        makeHelpListItem(Components.kGyroY, "Gyroscope Y axis (radians per second)."),
        makeHelpListItem(Components.kGyroZ, "Gyroscope Z axis (radians per second)."),
      ]))
      .action((args: string[]) => this.setDataComponents(args)));

    cmds.push(this.program.command(Commands.kGetData)
      .description("Queries the TRAX2 for data.")
      .action(() => this.getData()));

    cmds.push(this.program.command(Commands.kStartCal)
      .description(`Start user calibration with the current sensor acquisition parameters, internal\nconfigurations and FIR filter settings.\n- Note: in order to perform a user calibration, it is necessary to place the TRAX2 in Compass Mode.\n- Run '${Commands.kStartCal} -h' to view available CalOptions.`)
      .argument("<CalOption>", "The calibration option to apply.")
      .addHelpText("after", helpExampleText(`${Commands.kStartCal} ${CalOption.kFullRangeCal}`))
      .addHelpText("after", helpListToText("Available 'CalOption' values", [
        makeHelpListItem(CalOption.kFullRangeCal, "Recommended method when >45° of tilt is possible."),
        makeHelpListItem(CalOption.k2DCal, "Recommended when the available tilt range is limited to ≤5°."),
        makeHelpListItem(CalOption.kHIOnlyCal, "Recalibrates the hard-iron offset for a prior calibration."),
        makeHelpListItem(CalOption.kLimitedTiltCal, "Recommended method when >5° of tilt calibration is available, but tilt is restricted to <45°."),
        makeHelpListItem(CalOption.kAccelCalOnly, "Select this when an accelerometer calibration will be performed."),
        makeHelpListItem(CalOption.kAccelCalwithMag, "Selected when magnetic and accelerometer calibration will be done simultaneously."),
      ]))
      .action((calOption: string) => this.startCal(calOption)));

    cmds.push(this.program.command(Commands.kGetAcqParams)
      .description("Get the sensor acquisition parameters in the TRAX2.")
      .action(() => this.getAcquisitionParams()));

    cmds.push(this.program.command(Commands.kSetAcqParams)
      .description("Set the sensor acquisition parameters in the TRAX2.")
      .usage("<mode> [options]")
      .argument("<mode>", "Set '0' for Continuous Mode or '1' for Polled Acquisition Mode.", (value) => {
        const int = Number(value);
        if (Number.isNaN(int) || (int !== 0 && int !== 1)) {
          throw new Commander.InvalidArgumentError("Must be '0' or '1'.");
        }
        return String(int);
      })
      .addArgument(new Commander.Argument("[flush]", "Results in the FIR filter being flushed after every measurement.\n- Set '1' to enable and '0' to disable.")
        .default("0")
        .argParser((value) => {
          const int = Number(value);
          if (Number.isNaN(int) || (int !== 0 && int !== 1)) {
            throw new Commander.InvalidArgumentError("Must be '0' or '1'.");
          }
          return String(int);
        }))
      .addArgument(new Commander.Argument("[delay]", "Time delay in seconds for Continuous Mode.")
        .default("0")
        .argParser((value) => {
          const float = Number(value);
          if (Number.isNaN(float)) {
            throw new Commander.InvalidArgumentError("Must be a float.");
          }
          return String(float);
        }))
      .addHelpText("after", helpExampleText(`${Commands.kSetAcqParams} 1 1 0.725`, "Polled mode, flushFilters ON, sampleDelay 0.725 seconds"))
      .action((mode: string, flushFilters: string, sampleDelay: string) => this.setAcquisitionParams(mode, flushFilters, sampleDelay)));

    cmds.push(this.program.command(Commands.kSerialNumber)
      .description("Request Serial Number of TRAX2 unit.")
      .action(() => this.getSerialNumber()));

    cmds.push(this.program.command(Commands.kSetFunctionalMode)
      .description("Set the TRAX2 functional mode.")
      .argument("<mode>", "Set '0' to operate in Compass Mode or '1' to operate in AHRS Mode.", (value) => {
        const int = Number(value);
        if (Number.isNaN(int) || (int !== 0 && int !== 1)) {
          throw new Commander.InvalidArgumentError("Must be '0' or '1'.");
        }
        return String(int);
      })
      .action((args: string[]) => this.setFunctionalMode(args)));

    cmds.push(this.program.command(Commands.kGetFunctionalMode)
      .description("Get the TRAX2 functional mode.")
      .action(() => this.getFunctionalMode()));

    cmds.push(this.program.command(Commands.kSetResetRef)
      .description("Re-aligns the TRAX2 9-axis heading to the 6-axis (mag and accel) heading\nand establishes the criteria for the reference magnetic field.")
      .action(() => this.resetRef()));

    cmds.push(this.program.command(Commands.exit)
      .description("End the session.")
      .action(() => process.exit())); // TODO: Maybe just end readline?

    for (const cmd of cmds) {
      // The default behavior is to kill the process if the module reaches an 'error state'.
      // This can happen if the user asks for help, enters an invalid command, has missing required arguments, etc...
      // This stops that and restarts the prompt.
      cmd.exitOverride(); // throw instead of exit
      cmd.on("afterHelp", () => this.makePrompt());
    }

    this.setDecoderCallbacks();
  }

  start() {
    if (this.isStarted) { return; }
    this.isStarted = true;
    this.makePrompt();
  }

  handleResponse(bytes: Uint8Array) {
    if (this.debug) {
      console.log("<<", bytes.buffer);
    }
    this.decoder.decode(bytes);
  }

  private makePrompt() {
    this.promptOpen = true;
    this.rl.question("trax2 % ", (answer: string) => {
      this.promptOpen = false;
      const trimmedAnswer = answer.trim();
      if (!trimmedAnswer) {
        this.makePrompt();
        return;
      }

      const parts = trimmedAnswer.split(/\s+/);
      if (this.debug) {
        console.log("User input: ", parts);
      }
      try {
        this.program.parse(parts, { from: "user" });
      } catch (err) {
        if (this.debug) {
          if (err instanceof Commander.CommanderError) {
            console.log(`Commander parse error: { "code": "${err.code}", "message": "${err.message}" }`);
          } else {
            console.log("Commander parse error:", err);
          }
          if (this.promptOpen) {
            this.makePrompt();
          }
        }

        if (err instanceof Commander.CommanderError) {
          switch (err.code) {
            case "commander.unknownCommand":
              this.program.outputHelp();
              break;
            case "commander.help":
              break; // Rely on 'afterHelp' event to handle this.
            default:
              this.makePrompt();
              break;
          }
        } else {
          this.makePrompt();
        }
      }
    });
  }

  private sendRequest(bytes: Uint8Array, startNewTimeout = true) {
    if (startNewTimeout) {
      this.timeout = setTimeout(() => {
        console.log(`Command '${this.curretCommand}' timed out!`);
        this.curretCommand = "";
        this.makePrompt();
      }, 5000);
    } else {
      // This request doesn't have a response, sp wait 1 second.
      setTimeout(() => {
        this.makePrompt();
      }, 1000);
    }

    if (this.debug) {
      console.log(">>", bytes.buffer);
    }
    this.requestHandler(bytes);
  }

  private resetState() {
    this.curretCommand = "";
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private getModuleInfo() {
    this.curretCommand = Commands.kGetModInfo;
    this.sendRequest(this.encoder.getModuleInfo());
  }

  private setDataComponents(args: string[]) {
    const components: number[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const component = getComponentId(arg);
      if (typeof component === "number") {
        components.push(component);
      } else {
        console.log(`Unknown component: '${arg}'`);
      }
    }

    if (components.length) {
      this.sendRequest(this.encoder.setDataComponents(components), false);
    } else {
      console.log("No components were provided");
      this.makePrompt();
    }
  }

  private getData() {
    this.curretCommand = Commands.kGetData;
    this.sendRequest(this.encoder.getData());
  }

  private startCal(calOption: string) {
    const calOptionId = getCalOptionId(calOption);
    if (typeof calOptionId === "number") {
      this.sendRequest(this.encoder.startCal(calOptionId), false);
    } else {
      console.log(`The CalOption value of '${calOption}' is not valid.`);
      this.makePrompt();
    }
  }

  private getAcquisitionParams() {
    this.curretCommand = Commands.kGetAcqParams;
    this.sendRequest(this.encoder.getAcquisitionParams());
  }

  private setAcquisitionParams(mode: string, flushFilters: string, sampleDelay: string) {
    this.curretCommand = Commands.kSetAcqParams;
    this.sendRequest(this.encoder.setAcquisitionParams(Number(mode) !== 0, (Number(flushFilters) !== 0), Number(sampleDelay)));
  }

  private getSerialNumber() {
    this.curretCommand = Commands.kSerialNumber;
    this.sendRequest(this.encoder.getSerialNumber());
  }

  private setFunctionalMode(args: string[]) {
    if (!args.length) {
      console.log("The mode argument was not provided.");
      this.makePrompt();
      return;
    }

    const mode = Number(args[0]);
    this.sendRequest(this.encoder.setFunctionalMode(mode !== 0), false);
  }

  private getFunctionalMode() {
    this.curretCommand = Commands.kGetFunctionalMode;
    this.sendRequest(this.encoder.getFunctionalMode());
  }

  private resetRef() {
    this.sendRequest(this.encoder.resetRef(), false);
  }

  private setDecoderCallbacks() {
    this.decoder.onGetModuleInfo = (frame) => {
      if (this.curretCommand !== Commands.kGetModInfo) { return; }
      this.resetState();
      console.log(`GetModInfo: '${frame.name} ${frame.rev}'.`);
      this.makePrompt();
    };

    this.decoder.onGetSerialNumber = (frame) => {
      if (this.curretCommand !== Commands.kSerialNumber) { return; }
      this.resetState();
      console.log(`SerialNumber: '${frame.serialNumber}'.`);
      this.makePrompt();
    };

    this.decoder.onGetData = (frame) => {
      // For now only support poll mode since continuous spams the console too much.
      if (this.curretCommand !== Commands.kGetData) { return; }
      this.resetState();
      console.log(frame.components);
      this.makePrompt();
    };

    this.decoder.onGetAcquisitionParams = (frame) => {
      if (this.curretCommand !== Commands.kGetAcqParams) { return; }
      this.resetState();
      console.log(`Acquisition params: '${frame.isPollMode ? "Polled" : "Continuous"} Mode', 'flushFilters=${frame.flushFilters}', 'sampleDelay=${Number(frame.sampleDelay.toPrecision(5))}'.`);
      this.makePrompt();
    };

    this.decoder.onSetAcquisitionParams = () => {
      if (this.curretCommand !== Commands.kSetAcqParams) { return; }
      this.resetState();
      console.log("Acquisition params were set.");
      this.makePrompt();
    };

    this.decoder.onGetFunctionalMode = (frame) => {
      if (this.curretCommand !== Commands.kGetFunctionalMode) { return; }
      this.resetState();
      console.log(`FunctionalMode: '${frame.isAhrsMode ? "AHRS Mode" : "Compass Mode"}'`);
      this.makePrompt();
    };
  }
}

// TODO: Add more commands. Also debate on if 'k' should be in format (to match documentation).
enum Commands {
  kGetModInfo = "kGetModInfo",
  kSetDataComponents = "kSetDataComponents",
  kGetData = "kGetData",
  kStartCal = "kStartCal",
  kStartContinuousMode = "kStartContinuousMode",
  kGetAcqParams = "kGetAcqParams",
  kSetAcqParams = "kSetAcqParams",
  kSerialNumber = "kSerialNumber",
  kSetFunctionalMode = "kSetFunctionalMode",
  kGetFunctionalMode = "kGetFunctionalMode",
  kSetResetRef = "kSetResetRef",

  exit = "exit",
}

enum Components {
  kHeading = "kHeading",
  kDistortion = "kDistortion",
  kCalStatus = "kCalStatus",
  kTemperature = "kTemperature",
  kAccelX = "kAccelX",
  kAccelY = "kAccelY",
  kAccelZ = "kAccelZ",
  kPitch = "kPitch",
  kRoll = "kRoll",
  kMagX = "kMagX",
  kMagY = "kMagY",
  kMagZ = "kMagZ",
  kGyroX = "kGyroX",
  kGyroY = "kGyroY",
  kGyroZ = "kGyroZ",
  kQuaternion = "kQuaternion",
  kHeadingStatus = "kHeadingStatus",
}

enum CalOption {
  kFullRangeCal = "kFullRangeCal",
  k2DCal = "k2DCal",
  kHIOnlyCal = "kHIOnlyCal",
  kLimitedTiltCal = "kLimitedTiltCal",
  kAccelCalOnly = "kAccelCalOnly",
  kAccelCalwithMag = "kAccelCalwithMag",
}

function getComponentId(component: string) {
  switch (component) {
    case Components.kHeading:
      return Protocol.ComponentId.Heading;
    case Components.kDistortion:
      return Protocol.ComponentId.Distortion;
    case Components.kCalStatus:
      return Protocol.ComponentId.CalStatus;
    case Components.kTemperature:
      return Protocol.ComponentId.Temperature;
    case Components.kAccelX:
      return Protocol.ComponentId.AccelX;
    case Components.kAccelY:
      return Protocol.ComponentId.AccelY;
    case Components.kAccelZ:
      return Protocol.ComponentId.AccelZ;
    case Components.kPitch:
      return Protocol.ComponentId.Pitch;
    case Components.kRoll:
      return Protocol.ComponentId.Roll;
    case Components.kMagX:
      return Protocol.ComponentId.MagX;
    case Components.kMagY:
      return Protocol.ComponentId.MagY;
    case Components.kMagZ:
      return Protocol.ComponentId.MagZ;
    case Components.kGyroX:
      return Protocol.ComponentId.GyroX;
    case Components.kGyroY:
      return Protocol.ComponentId.GyroY;
    case Components.kGyroZ:
      return Protocol.ComponentId.GyroZ;
    case Components.kQuaternion:
      return Protocol.ComponentId.Quaternion;
    case Components.kHeadingStatus:
      return Protocol.ComponentId.HeadingStatus;
    default:
      return null;
  }
}

function getCalOptionId(calOption: string) {
  switch (calOption) {
    case CalOption.kFullRangeCal:
      return Protocol.CalOptionId.FullRangeCal;
    case CalOption.k2DCal:
      return Protocol.CalOptionId.TwoDCal;
    case CalOption.kHIOnlyCal:
      return Protocol.CalOptionId.HIOnlyCal;
    case CalOption.kLimitedTiltCal:
      return Protocol.CalOptionId.LimitedTiltCal;
    case CalOption.kAccelCalOnly:
      return Protocol.CalOptionId.AccelCalOnly;
    case CalOption.kAccelCalwithMag:
      return Protocol.CalOptionId.AccelCalwithMag;
    default:
      return null;
  }
}

interface HelpListItem {
  name: string;
  desc?: string;
}

function makeHelpListItem(name: string, desc = ""): HelpListItem {
  return { name, desc };
}

// A simplified version of 'formatHelp'.
// See: https://github.com/tj/commander.js/blob/43f4743864e2f670db5eebcf88c92aa4612c54f1/lib/help.js#L293
function helpListToText(title: string, items: HelpListItem[]) {
  const indent = 2;
  const separatorWidth = 2;
  let maxItemNameWidth = 0;
  for (const item of items) {
    maxItemNameWidth = Math.max(maxItemNameWidth, item.name.length);
  }

  let text = `\n${title}:`;

  for (const item of items) {
    let line = "\n" + " ".repeat(indent) + item.name;
    if (item.name.length < maxItemNameWidth) {
      line += " ".repeat(maxItemNameWidth - item.name.length);
    }
    line += " ".repeat(separatorWidth);
    if (item.desc) {
      const descriptionLines = item.desc.split("\n");
      line += descriptionLines[0];
      for (let i = 1; i < descriptionLines.length; i++) {
        line += "\n" + " ".repeat(indent + maxItemNameWidth + separatorWidth) + descriptionLines[i];
      }
    }

    text += line;
  }

  return text;
}

function helpExampleText(sampleCommnd: string, description = "") {
  const indent = 2;
  let text = "\nExample:\n" + " ".repeat(indent);
  text += "trax2 % " + sampleCommnd;
  if (description) {
    text += `        (${description})`;
  }
  return text;
}
