const Cloud = require('@tuyapi/cloud');
const debug = require('debug')('@tuyapi/link:wizard');
const TuyaLink = require('./lib/link.js');

/**
* A wrapper that combines `@tuyapi/cloud` and
* `(@tuyapi/link).manual` (included in this package)
* to make registration Just Work™️. Exported as
* `(@tuyapi/link).wizard`.
* @class
* @param {Object} options construction options
* @param {String} options.apiKey API key
* @param {String} options.apiSecret API secret
* @param {String} options.email user email
* @param {String} options.password user password
* @param {String} [options.region='AZ'] region (AZ=Americas, AY=Asia, EU=Europe)
* @param {String} [options.timezone='-05:00'] timezone of device
* @example
* // Note: user account does not need to already exist
* const register = new TuyaLink.wizard({key: 'your-api-key',
*                                           secret: 'your-api-secret',
*                                           email: 'example@example.com',
*                                           password: 'example-password'});
*/
function TuyaLinkWizard(options) {
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

  // Construct instance of TuyaLink
  this.device = new TuyaLink();
}

/**
* Logins to Tuya cloud using credentials provided to constructor
* @example
* register.init()
* @returns {Promise<String>} A Promise that contains the session ID
*/
TuyaLinkWizard.prototype.init = function () {
  // Register/login user
  return this.api.register({email: this.email, password: this.password});
};

/**
* Links device to WiFi and cloud
* @param {Object} options
* options
* @param {String} options.ssid
* the SSID to send to the device
* @param {String} options.wifiPassword
* password for the SSID
* @param {Number} [options.devices=1]
* if linking more than 1 device at a time,
* set to number of devices being linked
* @example
* register.linkDevice({ssid: 'example-ssid',
                       wifiPassword: 'example-password'}).then(device => {
*   console.log(device);
* });
* @returns {Promise<Object>} A Promise that contains data on device(s)
*/
TuyaLinkWizard.prototype.linkDevice = async function (options) {
  if (!options.ssid || !options.wifiPassword) {
    throw new Error('Both SSID and WiFI password must be provided');
  }

  // Default for options.devices
  options.devices = options.devices ? options.devices : 1;

  try {
    const token = await this.api.request({action: 'tuya.m.device.token.create',
                                          data: {timeZone: this.timezone}});

    debug('Token: ', token);

    this.device.registerSmartLink({region: this.region,
                                   token: token.token,
                                   secret: token.secret,
                                   ssid: options.ssid,
                                   wifiPassword: options.wifiPassword});

    // While UDP packets are being sent, start polling for device
    debug('Polling cloud for details on token...');

    const devices = await this.api.waitForToken({token: token.token,
                                                 devices: options.devices});
    debug('Found device(s)!', devices);

    // Stop broadcasting setup data
    this.device.abortBroadcastingData();

    // Remove binding on socket
    this.device.cleanup();

    return devices;
  } catch (err) {
    this.device.cleanup();
    throw err;
  }
};

module.exports = {wizard: TuyaLinkWizard, manual: TuyaLink};
