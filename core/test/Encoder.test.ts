import { expect } from "chai";
import "mocha";

import { Encoder } from "../src/Encoder";
import * as Protocol from "../src/Protocol";

describe("Encoder", () => {
  it("getModuleInfo(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getModuleInfo();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x01,
      0xEF, 0xD4,
    ]));
  });

  it("getSerialNumber(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getSerialNumber();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x34,
      0x89, 0x22,
    ]));
  });

  it("setDataComponents(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.setDataComponents([
      Protocol.ComponentId.Heading,
      Protocol.ComponentId.Pitch,
      Protocol.ComponentId.Roll,
      Protocol.ComponentId.HeadingStatus,
    ]);

    expect(res).to.eql(new Uint8Array([
      0x00, 0x0a,
      0x03,
      0x04,
      0x05, 0x18, 0x19, 0x4f,
      0xe2, 0xef,
    ]));
  });

  it("setDeclination(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.setDeclination(12.5);

    expect(res).to.eql(new Uint8Array([
      0x00, 0x0A,
      0x06,
      0x01,
      0x41, 0x48, 0x00, 0x00,
      0x78, 0xDA,
    ]));
  });


  it("getDeclination(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getDeclination();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x06,
      0x07,
      0x01,
      0x3B, 0x16,
    ]));
  });

  it("setAcquisitionParams(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.setAcquisitionParams(false); // Turn on continuous mode.

    expect(res).to.eql(new Uint8Array([
      0x00, 0x0F,
      0x18,
      0x00,
      0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0xE4, 0x50,
    ]));
  });

  it("getAcquisitionParams(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getAcquisitionParams();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x19,
      0x7C, 0xED,
    ]));
  });

  it("getData(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getData();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x04,
      0xBF, 0x71,
    ]));
  });

  it("startContinuousMode(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.startContinuousMode();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x15,
      0xBD, 0x61,
    ]));
  });

  it("stopContinuousMode(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.stopContinuousMode();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x16,
      0x8D, 0x02,
    ]));
  });

  it("resetRef(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.resetRef();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x6E,
      0x72, 0x9D,
    ]));
  });

  it("setFunctionalMode(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.setFunctionalMode(true);

    expect(res).to.eql(new Uint8Array([
      0x00, 0x06,
      0x4f,
      0x01,
      0xBF, 0x73,
    ]));
  });

  it("getFunctionalMode(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.getFunctionalMode();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x50,
      0xA5, 0x00,
    ]));
  });

  it("save(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.save();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x09,
      0x6E, 0xDC,
    ]));
  });

  it("startCal(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.startCal(Protocol.CalOptionId.FullRangeCal);

    expect(res).to.eql(new Uint8Array([
      0x00, 0x09,
      0x0A,
      0x00, 0x00, 0x00, 0x0A,
      0xAF, 0x06,
    ]));
  });

  it("takeUserCalSample(), produces correct command.", () => {
    const api = new Encoder();

    const res = api.takeUserCalSample();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x1f,
      0x1C, 0x2B,
    ]));
  });

  it("stopCal), produces correct command.", () => {
    const api = new Encoder();

    const res = api.stopCal();

    expect(res).to.eql(new Uint8Array([
      0x00, 0x05,
      0x0b,
      0x4E, 0x9E,
    ]));
  });
});
