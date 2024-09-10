export const kSuccessData = {
  data: {},
  message: 'SUCCESS',
  statusCode: 200,
  valid: true,
};
export const kCreateSuccessData = {
  data: {},
  message: 'Data inserted Successfully',
  statusCode: 201,
  valid: true,
};

export const kNeedOfficialSalarySlip = {
  message: 'Please upload official salary slip',
  statusCode: 301,
  valid: false,
};

export const kNotEligibleForBalance = {
  message: 'You are not eligible for the loan as per the eligibility criteria',
  statusCode: 302,
  valid: false,
};

export const kBadRequest = {
  message: 'BAD_REQUEST',
  statusCode: 302,
  valid: false,
};

export const kParamsMissing = {
  message: 'REQUIRED_PARAMS_MISSING',
  statusCode: 422,
  valid: false,
};

export const kInternalError = {
  message: 'INTERNAL_SERVER_ERROR',
  statusCode: 500,
  valid: false,
};

export const kNoDataFound = {
  statusCode: 404,
  valid: false,
  message: 'NO_DATA_FOUND',
  data: {},
};

export const kUnproccesableEntity = {
  statusCode: 422,
  valid: false,
  message: 'FAILED',
  data: {},
};

// KYC
export const kWrongDetails = {
  statusCode: 422,
  message: 'Wrong details',
  valid: false,
  data: { message: 'Wrong details' },
};

export const kWrongOtp = {
  statusCode: 422,
  message: 'Wrong OTP',
  valid: false,
  data: { message: 'Wrong details Wrong OTP' },
};

export const kAadharAlreadyExist = {
  statusCode: 422,
  message: 'Aadhar already exist',
  valid: false,
  data: { message: 'Aadhar already exist' },
};

export const kAadharNotProcess = {
  statusCode: 200,
  message: 'Aadhaar card could not be processed, gone for manual verification',
  valid: false,
  data: {
    message:
      'Aadhaar card could not be processed, gone for manual verification',
  },
};

export const kBadFormatPAN = {
  statusCode: 422,
  message: 'The format and content used in the request for PAN are mismatched',
  valid: false,
  data: {
    message:
      'The format and content used in the request for PAN are mismatched',
    status: '0',
  },
};

export const k422ErrorMessage = (message?: any) => {
  return {
    statusCode: 422,
    message: message ?? 'Wrong details',
    valid: false,
    data: { message: message ?? 'Wrong details' },
  };
};

export const kParamMissing = (parameter?: any) => {
  const message = parameter
    ? `Required parameter ${parameter} is missing`
    : 'Required parameter missing';
  return {
    statusCode: 422,
    message,
    valid: false,
    data: { message },
  };
};

export const kInvalidParamValue = (parameter) => {
  const message = `Parameter ${parameter} has invalid value`;
  return {
    statusCode: 422,
    message,
    valid: false,
  };
};

export const k409ErrorMessage = (message?: any) => {
  return {
    statusCode: 409,
    message: message ?? 'Already exists details',
    valid: false,
    data: { message: message ?? 'Already exists details' },
  };
};

export const kUnproccesableData = (data: any = {}) => {
  return {
    statusCode: 422,
    message: 'FAILED',
    valid: false,
    data: data,
  };
};

export const kSUCCESSMessage = (message?: any, data?: any) => {
  return {
    statusCode: 200,
    message: message ? message : 'SUCCESS',
    valid: true,
    data: data ?? {},
  };
};


export const k403Forbidden = {
  statusCode: 403,
  valid: false,
  message: 'Forbidden resource',
  error: 'Forbidden',
};

export const kTimeout = {
  statusCode: 408,
  valid: false,
  message: 'REQUEST_TIMEOUT',
  data: {},
};

export const KManyRequest = {
  data: {},
  statusCode: 429,
  message:
    'You have reached the maximum limit for sending messages on WhatsApp today',
  valid: false,
};
export const kMockSenseDataAddresses = {
  status: true,
  message: 'Success',
  data: {
    id: '60cb770cf16a4473b6294f7b1fd8f9f0',
    status: 'SUCCESS',
    additionalStatus: 'ANALYSIS_COMPLETED',
    type: 'Zomato',
    createdAt: '2022-07-26T13:44:47',
    info: {
      name: 'Rahil Patel',
      email: null,
      mobile: '7600550021',
      city: null,
    },
    address: [
      {
        id: 12431,
        name: 'Work',
        address: '703, Zion prime, 7th floor, Hebatpur',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
      {
        id: 12432,
        name: 'Home',
        address:
          '305, Magnumm Inn, Above Honest 3rd floor, 3rd floor, Joshipura',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
      {
        id: 12433,
        name: 'Work',
        address:
          '410 A, Shilp Aron, Sindhubhavan road, bodakdev, Shilp Aaron, Bodakdev, Ahmedabad, Gujarat, India',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
      {
        id: 12434,
        name: 'Home',
        address: 'A4, Shree Chala, Ground Floor, Chala, Vapi',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
      {
        id: 12435,
        name: 'Home',
        address:
          '23, Aarohi Vila, Near Sun City, Marvel Society, South Bopal, Bopal, Ahmedabad',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
      {
        id: 12436,
        name: 'Home',
        address: '23, Aarohi Villa, Near Sun City, South Bopal, Bopal',
        isDefault: null,
        isBusiness: null,
        createdAt: '2022-07-26T13:45:55',
      },
    ],
  },
};

export const kSuccessMessage = (message?: any) => {
  return {
    statusCode: 200,
    message: message ?? 'SUCCESS',
    valid: true,
    data: { message: message ?? 'SUCCESS' },
  };
};
