const Cloud = require('@tuyapi/cloud');
const debug = require('debug')('TuyaRegisterWizard');
const TuyaRegister = require('./register.js');

// Options.apiKey
// options.apiSecret
// options.email
// options.password
// options.region | AZ
// options.timezone | -05:00
function TuyaRegisterWizard(options) {
  // Set to empty object if undefined
  options = options ? options : {};

  if (!options.email || !options.password) {
    throw new Error('Both email and password must be provided');
  }

  this.email = options.email;
  this.password = options.password;

  // Set defaults
  this.region = options.region ? options.region : 'AZ';
  this.timezone = options.timezone ? options.timezone : '-05:00';

  // Don't need to check key and secret for correct format as
  // tuyapi/cloud already does
  this.api = new Cloud({key: options.apiKey,
                        secret: options.apiSecret,
                        region: this.region});

  // Construct instance of TuyaRegister
  this.device = new TuyaRegister();
}

TuyaRegisterWizard.prototype.init = function () {
  return this.api.register({email: this.email, password: this.password});
};

// Options.ssid
// options.wifipassword
// options.#of devices | 1
TuyaRegisterWizard.prototype.linkDevice = async function (options) {
  if (!options.ssid || !options.wifiPassword) {
    throw new Error('Both SSID and WiFI password must be provided');
  }

  // Default for options.devices
  options.devices = options.devices ? options.devices : 1;

  try {
    const token = await this.api.request({action: 'tuya.m.device.token.create',
                                          data: {timeZone: this.timezone}});

    debug('Token: ', token);

    await this.device.registerSmartLink({region: this.region,
                                         token: token.token,
                                         secret: token.secret,
                                         ssid: options.ssid,
                                         wifiPassword: options.wifiPassword});

    // While UDP packets are being sent, start polling for device
    debug('Polling cloud for details on token...');

    const devices = await this.api.waitForToken({token: token.token,
                                                 devices: options.devices});
    debug('Found device(s)!', devices);

    // Remove binding on socket
    this.device.cleanup();

    return devices;
  } catch (err) {
    this.device.cleanup();
    return err;
  }
};

module.exports = {wizard: TuyaRegisterWizard, manual: TuyaRegister};
