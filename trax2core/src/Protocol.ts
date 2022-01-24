export enum FrameId {
  GetModInfo = 1, // Queries the device’s type and firmware revision.
  GetModInfoResp = 2, // Response to GetModInfo
  SetDataComponents = 3, // Sets the data components to be output.
  GetData = 4, // Queries the TRAX2 for data
  GetDataResp = 5, // Response to GetData
  SetConfig = 6, // Sets internal configurations in TRAX2
  GetConfig = 7, // Queries TRAX2 for the current internal configuration
  GetConfigResp = 8, // Response to GetConfig
  Save = 9,
  StartCal = 10,
  StopCal = 11,
  SetFIRFilters = 12,
  GetFIRFilters = 13,
  GetFIRFiltersResp = 14,
  PowerDown = 15,
  SaveDone = 16,
  UserCalSampleCount = 17,
  UserCalScore = 18,
  SetConfigDone = 19,
  SetFIRFiltersDone = 20,
  StartContinuousMode = 21, // If the TRAX2 is configured to operate in Continuous Acquisition Mode (see kSetAcqParams), then this frame initiates the outputting of data at a relatively fixed data rate, where the data rate is established by the SampleDelay parameter. The frame has no payload.
  StopContinuousMode = 22, // This frame commands the TRAX2 to stop data output when in Continuous Acquisition Mode. The frame has no payload.
  PowerUpDone = 23,
  SetAcqParams = 24,
  GetAcqParams = 25,
  SetAcqParamsDone = 26,
  GetAcqParamsResp = 27,
  PowerDownDone = 28,
  FactoryMagCoeff = 29,
  FactoryMagCoeffDone = 30,
  TakeUserCalSample = 31,
  FactoryAccelCoeff = 36,
  FactoryAccelCoeffDone = 37,
  CopyCoeffSet = 43,
  CopyCoeffSetDone = 44,
  SerialNumber = 52,
  SerialNumberResp = 53,
  SetFunctionalMode = 79,
  GetFunctionalMode = 80,
  GetFunctionalModeResp = 81,
  SetDistortMode = 107,
  GetDistortMode = 108,
  GetDistortModeResp = 109,
  SetResetRef = 110,
  SetMagTruthMethod = 119,
  GetMagTruthMethod = 120,
  GetMagTruthMethodResp = 121,
  SetMergeRate = 128,
  GetMergeRate = 129,
  GetMergeRateResp = 130,
}

export enum ConfigId {
  Declination = 1,
  TrueNorth = 2,
  BigEndian = 6,
  MountingRef = 10,
  UserCalNumPoints = 12,
  UserCalAutoSampling = 13,
  BaudRate = 14,
  MilOut = 15, // Sets the output units as mils (TRUE) or degrees (FALSE). The default is FALSE.
  HPRDuringCal = 16,
  MagCoeffSet = 18,
  AccelCoeffSet = 19,
}

export enum MergeRateId {
  MergeRate = 5,
  MagRate = 6,
}

export enum ComponentId {
  Heading = 5,
  Temperature = 7,
  Distortion = 8,
  CalStatus = 9,
  AccelX = 21,
  AccelY = 22,
  AccelZ = 23,
  Pitch = 24,
  Roll = 25,
  MagX = 27,
  MagY = 28,
  MagZ = 29,
  GyroX = 74,
  GyroY = 75,
  GyroZ = 76,
  Quaternion = 77,
  HeadingStatus = 79,
}

export enum CalOptionId {
  FullRangeCal = 10,
  TwoDCal = 20,
  HIOnlyCal = 30,
  LimitedTiltCal = 40,
  AccelCalOnly = 100,
  AccelCalwithMag = 110,
}
