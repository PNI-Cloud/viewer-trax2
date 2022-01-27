import chai from "chai";
import "mocha";
import chaiAlmost from "chai-almost";

import { Decoder } from "../src/Decoder";
import * as Protocol from "../src/Protocol";

chai.use(chaiAlmost(0.00001));

describe("Decoder", () => {
  it("decode(), FrameId.GetModInfoResp, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x0D, // Length
      0x02, // Id
      0x54, 0x52, 0x41, 0x58, // Name
      0x50, 0x37, 0x33, 0x34, // Rev
      0x2B, 0x91, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetModuleInfo = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      name: "TRAX",
      rev: "P734",
      id: Protocol.FrameId.GetModInfoResp,
      crc16Expected: 0x2B91,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.GetModInfoResp, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x0d,
      0x02,
      0x54, 0x52, 0x58, 0x32,
      0x4d, 0x30, 0x33, 0x34,
      0x81, 0x34,
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetModuleInfo = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      name: "TRX2",
      rev: "M034",
      id: Protocol.FrameId.GetModInfoResp,
      crc16Expected: 0x8134,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.SerialNumberResp, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x09, // Length
      0x35, // Id
      0x00, 0x0F, 0xBE, 0x43, // Serial Number
      0x0E, 0xCF, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetSerialNumber = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      serialNumber: 1031747,
      id: Protocol.FrameId.SerialNumberResp,
      crc16Expected: 0x0ECF,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.SerialNumberResp, incorrect crc16 and correct output", () => {
    const bytes = new Uint8Array([
      0x00, 0x09, // Length
      0x35, // Id
      0x00, 0x0F, 0xBE, 0x43, // Serial Number
      0x0E, 0xCF + 1, // Crc16, intentionally incorrect
    ]);
    const decoder = new Decoder();
    decoder.skipCrc8ErrorFrame = false;

    let res: object | null = null;
    decoder.onGetSerialNumber = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      serialNumber: 1031747,
      id: Protocol.FrameId.SerialNumberResp,
      crc16Expected: 0x0ECF + 1,
      crc16ErrorStatus: true,
    });
  });

  it("decode(), FrameId.SetAcqParamsDone, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x05, // Length
      0x1A, // Id
      0x4C, 0x8E, // Crc16
    ]);
    const decoder = new Decoder();
    decoder.skipCrc8ErrorFrame = false;

    let res: object | null = null;
    decoder.onSetAcquisitionParams = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      id: Protocol.FrameId.SetAcqParamsDone,
      crc16Expected: 0x4C8E,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.GetAcqParamsResp, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x0F, // Length
      0x1b, // Id
      0x01, // Is poll mode?
      0x00, // Flush Filters?
      0x00, 0x00, 0x00, 0x00, // Reserved
      0x3f, 0xe9, 0x99, 0x9a, // Sample delay
      0xB5, 0xC8, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetAcquisitionParams = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.almost.eql({
      isPollMode: true,
      flushFilters: false,
      sampleDelay: 1.825,
      id: Protocol.FrameId.GetAcqParamsResp,
      crc16Expected: 0xB5C8,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.GetDataResp, split into 3 chunks, correct crc16 and output", () => {
    const bytes1 = new Uint8Array([
      0x00, 0x17, // Length
      0x05, // Id
      0x04, // Number of data components.
      0x05, 0x43, 0x8E, // Heading id and 2 bytes
    ]);
    const bytes2 = new Uint8Array([
      0x96, 0x70, // Heading 2 bytess
      0x18, 0x3D, 0xD8, 0x98, 0x38, // Pitch
      0x19, 0xBE, 0xC5, 0x2B, 0x52, // Roll
      0x4f, // Heading Status id
    ]);
    const bytes3 = new Uint8Array([
      0x01, // Heading Status byte
      0xA2, 0x3E, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetData = (frame) => {
      res = frame;
    };
    decoder.decode(bytes1);
    decoder.decode(bytes2);
    decoder.decode(bytes3);

    chai.expect(res).to.almost.eql({
      components: [{
        id: Protocol.ComponentId.Heading,
        values: [285.1753],
      }, {
        id: Protocol.ComponentId.Pitch,
        values: [0.105759084],
      }, {
        id: Protocol.ComponentId.Roll,
        values: [-0.385096133],
      }, {
        id: Protocol.ComponentId.HeadingStatus,
        values: [1],
      }],
      raw: new Uint8Array([...bytes1, ...bytes2, ...bytes3]),
      id: Protocol.FrameId.GetDataResp,
      crc16Expected: 0xA23E,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.SetConfigDone, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x05, // Length
      0x13, // Id
      0xDD, 0xA7, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onSetConfig = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      id: Protocol.FrameId.SetConfigDone,
      crc16Expected: 0xDDA7,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.GetConfigResp, ConfigId.Declination, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x0a, // Length
      0x08, // Id
      0x01, // ConfigId
      65, 32, 0, 0, // Value
      0xCA, 0xB3, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetDeclination = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      declination: 10,
      id: Protocol.FrameId.GetConfigResp,
      crc16Expected: 0xCAB3,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), FrameId.GetFunctionalModeResp, correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x00, 0x06, // Length
      0x51, // Id
      0x00,
      0x8F, 0x2E, // Crc16
    ]);
    const decoder = new Decoder();

    let res: object | null = null;
    decoder.onGetFunctionalMode = (frame) => {
      res = frame;
    };
    decoder.decode(bytes);

    chai.expect(res).to.eql({
      isAhrsMode: false,
      id: Protocol.FrameId.GetFunctionalModeResp,
      crc16Expected: 0x8F2E,
      crc16ErrorStatus: false,
    });
  });

  it("decode(), [FrameId.UserCalSampleCount, FrameId.GetDataResp], correct crc16 and output", () => {
    const bytes = new Uint8Array([
      0x02, 0x54, 0x52, 0x41, 0x58, 0x50, 0x37, 0x33, 0x34, 0x2B, 0x91, // Gargabe
      0x00, 0x09,
      0x11,
      0x00, 0x00, 0x00, 0x00,
      0xe6, 0xe9,
      0x00, 0x15,
      0x05,
      0x03,
      0x05, 0x42, 0x7c, 0x89, 0x60,
      0x18, 0x40, 0x8e, 0x7d, 0x22,
      0x19, 0xc0, 0xc2, 0x89, 0x1c,
      0x85, 0x4a,
    ]);
    const decoder = new Decoder();

    const res: object[] = [];
    decoder.onUserCalSampleCount = (frame) => {
      res.push(frame);
    };
    decoder.onGetData = (frame) => {
      res.push(frame);
    };
    decoder.decode(bytes);

    chai.expect(res).to.almost.eql([{
      count: 0,
      id: Protocol.FrameId.UserCalSampleCount,
      crc16Expected: 0xe6e9,
      crc16ErrorStatus: false,
    }, {
      raw: bytes.slice(20, bytes.byteLength),
      components: [{
        id: Protocol.ComponentId.Heading,
        values: [63.1341553],
      }, {
        id: Protocol.ComponentId.Pitch,
        values: [4.452775],
      }, {
        id: Protocol.ComponentId.Roll,
        values: [-6.079237],
      }],
      id: Protocol.FrameId.GetDataResp,
      crc16Expected: 0x854a,
      crc16ErrorStatus: false,
    }]);
  });

  describe("Two FrameId.GetDataResp tests.", () => {
    const bytes1 = new Uint8Array([
      0, 23, 5, 1, 77, 188, 191, 55, 228, 60, 154, 195, 77, 62, 155, 28, 124, 63, // Quaternion 1st part
    ]);
    const bytes2 = new Uint8Array([
      115, 217, 47, 221, 2, // Quaternion 2nd part
      0, 11, 5, 1, 7, 65, 200, 128, 0, 1, 154, // Temperature
    ]);

    it("decode(), default settings, 2 valid frames", () => {
      const decoder = new Decoder();

      const res: object[] = [];
      decoder.onGetData = (frame) => {
        res.push(frame);
      };
      decoder.decode(bytes1);
      decoder.decode(bytes2);

      chai.expect(res).to.almost.eql([{
        raw: new Uint8Array([...bytes1, ...bytes2.slice(0, 5)]),
        components: [{
          id: Protocol.ComponentId.Quaternion,
          values: [-0.0233420, 0.01889195, 0.3029516, 0.9525327],
        }],
        id: Protocol.FrameId.GetDataResp,
        crc16Expected: 0xDD02,
        crc16ErrorStatus: false,
      }, {
        raw: bytes2.slice(5),
        components: [{
          id: Protocol.ComponentId.Temperature,
          values: [25.0625],
        }],
        id: Protocol.FrameId.GetDataResp,
        crc16Expected: 0x019A,
        crc16ErrorStatus: false,
      }]);
    });

    it("decode(), unprocessedByteLimit=15, unprocessedByteTruncation=10, 1 valid frame", () => {
      const decoder = new Decoder();
      decoder.unprocessedByteLimit = 15;
      decoder.unprocessedByteTruncation = 10;

      const res: object[] = [];
      decoder.onGetData = (frame) => {
        res.push(frame);
      };
      decoder.decode(bytes1);
      decoder.decode(bytes2);

      chai.expect(res).to.eql([{
        raw: bytes2.slice(5),
        components: [{
          id: Protocol.ComponentId.Temperature,
          values: [25.0625],
        }],
        id: Protocol.FrameId.GetDataResp,
        crc16Expected: 0x019A,
        crc16ErrorStatus: false,
      }]);
    });
  });
});
