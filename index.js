const Cloud = require('@tuyapi/openapi');
const debug = require('debug')('@tuyapi/link:wizard');
const TuyaLink = require('./lib/link.js');

/**
 * A wrapper that combines `@tuyapi/openapi` and
 * `(@tuyapi/link).manual` (included in this package)
 * to make registration Just Work™️. Exported as
 * `(@tuyapi/link).wizard`.
 * @class
 * @param {Object} options construction options
 * @param {String} options.apiKey API key
 * @param {String} options.apiSecret API secret
 * @param {String} options.schema app schema to register the device under
 * @param {String} options.email user email
 * @param {String} options.password user password
 * @param {String} [options.region='us'] region (us=Americas, cn=Asia, eu=Europe)
 * @param {String} [options.timezone='America/Chicago'] timezone of device in tz format
 * @example
 * // Note: user account does not need to already exist
 * const register = new TuyaLink.wizard({key: 'your-api-key',
 *                                           secret: 'your-api-secret',
 *                                           email: 'example@example.com',
 *                                           password: 'example-password'});
 */
class TuyaLinkWizard {
  constructor({email, password, region = 'us', timezone = 'America/Chicago', apiKey, apiSecret, schema} = {}) {
    if (!email || !password) {
      throw new Error('Both email and password must be provided');
    }

    this.email = email;
    this.password = password;
    this.region = region;
    this.timezone = timezone;

    // Don't need to check key and secret for correct format as
    // tuyapi/openapi already does
    this.api = new Cloud({key: apiKey, secret: apiSecret, region, schema});

    // Construct instance of TuyaLink
    this.device = new TuyaLink();
  }

  /**
   * Logins to Tuya cloud using credentials provided to constructor
   * @example
   * register.init()
   * @returns {Promise<String>} A Promise that contains the session ID
   */
  async init() {
    // Register/login user
    await this.api.getToken();

    this.uid = await this.api.putUser({countryCode: '1', username: this.email, password: this.password, usernameType: 2});
  }

  /**
   * Links device to WiFi and cloud
   * @param {Object} options
   * options
   * @param {Number} [options.timeout=60]
   * how long we should wait for devices to
   * connect before throwing an error, in seconds
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
  async linkDevice({timeout = 60, ssid, wifiPassword = '', devices = 1} = {}) {
    if (!ssid) {
      throw new Error('SSID must be provided');
    }

    try {
      const token = await this.api.getDeviceToken({uid: this.uid, timezone: this.timezone});

      debug('Token: ', token);

      this.device.registerSmartLink({region: this.region,
                                     token: token.token,
                                     secret: token.secret,
                                     ssid,
                                     wifiPassword});

      // While UDP packets are being sent, start polling for device
      debug('Polling cloud for details on token...');

      let waitingForDevices = true;
      let lastAPIResponse = {};

      const timeoutAt = new Date().getTime() + (timeout * 1000);

      while (waitingForDevices) {
        // eslint-disable-next-line no-await-in-loop
        lastAPIResponse = await this.api.getDevicesByToken(token.token);

        debug(`${lastAPIResponse.successDevices.length} devices returned by API.`);

        if (lastAPIResponse.successDevices.length >= devices) {
          waitingForDevices = false;
        }

        // Check for timeout
        const now = new Date().getTime();

        if (now > timeoutAt) {
          throw new Error('Timed out waiting for devices to connect.');
        }
      }

      const returnedDevices = lastAPIResponse.successDevices;

      debug('Found device(s)!', returnedDevices);

      // Stop broadcasting setup data
      this.device.abortBroadcastingData();

      // Remove binding on socket
      this.device.cleanup();

      return returnedDevices;
    } catch (error) {
      this.device.cleanup();
      throw error;
    }
  }
}

module.exports = {wizard: TuyaLinkWizard, manual: TuyaLink};
