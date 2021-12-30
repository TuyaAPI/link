const {TuyaContext} = require('@tuya/tuya-connector-nodejs');
const delay = require('delay');
const debug = require('debug')('@tuyapi/link:wizard');
const TuyaLink = require('./lib/link.js');

/**
 * A wrapper that combines `@tuya/tuya-connector-nodejs` and
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
  constructor({email, password, region = 'us', timezone = 'America/Chicago', apiKey, apiSecret, schema, bindAddr} = {}) {
    if (!email || !password) {
      throw new Error('Both email and password must be provided');
    }

    this.email = email;
    this.password = password;
    this.region = region;
    this.timezone = timezone;
    this.bindAddr = bindAddr;

    this.api = new TuyaContext({
      baseUrl: `https://openapi.tuya${region}.com`,
      accessKey: apiKey,
      secretKey: apiSecret
    });
    this.schema = schema;

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
    const result = await this.api.request({
      path: `/v1.0/apps/${this.schema}/user`,
      method: 'POST',
      body: {
        schema: this.schema,
        country_code: '1',
        username: this.email,
        password: this.password,
        username_type: 2,
        nick_name: this.email
      }
    });

    if (!result.success) {
      throw new Error(result.msg);
    }

    this.uid = result.result.uid;
  }

  /**
   * Links device to WiFi and cloud
   * @param {Object} options
   * options
   * @param {Number} [options.timeout=100]
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
  async linkDevice({timeout = 100, ssid, wifiPassword = '', devices = 1} = {}) {
    if (!ssid) {
      throw new Error('SSID must be provided');
    }

    try {
      const response = await this.api.request({
        path: '/v1.0/device/paring/token',
        method: 'POST',
        body: {
          uid: this.uid,
          timeZoneId: this.timezone,
          paring_type: 'EZ'
        }
      });

      if (!response.success) {
        throw new Error(response.msg);
      }

      const token = response.result;

      debug('Token: ', token);

      this.device.registerSmartLink({region: token.region,
                                     token: token.token,
                                     secret: token.secret,
                                     ssid,
                                     wifiPassword,
                                     bindAddr: this.bindAddr});

      // While UDP packets are being sent, start polling for device
      debug('Polling cloud for details on token...');

      let waitingForDevices = true;
      let lastAPIResponse = {};

      const timeoutAt = new Date().getTime() + (timeout * 1000);

      while (waitingForDevices) {
        // eslint-disable-next-line no-await-in-loop
        lastAPIResponse = await this.api.request({
          path: `/v1.0/device/paring/tokens/${token.token}`,
          method: 'GET'
        });

        if (!lastAPIResponse.success) {
          throw new Error(lastAPIResponse.msg);
        }

        const {result} = lastAPIResponse;

        debug(`${result.success.length} devices returned by API.`);

        if (result.success.length >= devices) {
          waitingForDevices = false;
        }

        // Check for timeout
        const now = new Date().getTime();

        if (now > timeoutAt) {
          throw new Error('Timed out waiting for devices to connect.');
        }

        // eslint-disable-next-line no-await-in-loop
        await delay(1000);
      }

      const returnedDevices = lastAPIResponse.result.success;

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

  async getLinkedDevices({ ids, pageNumber = 0, pageSize = 100 } = { pageNumber: 0, pageSize: 100 }){

    const searchParameters = {
      schema: this.schema,
      page_no: pageNumber,
      page_size: pageSize
    };
    if (ids) {
        searchParameters.device_ids = ids.toString();
    }

    const response = await this.api.request({
      path: '/v1.0/devices',
      method: 'GET',
      query: searchParameters
    });

    if (!response.success) {
      throw new Error(response.msg);
    }

    const batchDevices = response.result;
    debug('Retrieved device(s)!', batchDevices);

    return batchDevices
  }
}

module.exports = {wizard: TuyaLinkWizard, manual: TuyaLink};
