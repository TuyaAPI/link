tuyapi/link [![Build Status](https://travis-ci.org/TuyaAPI/link.svg?branch=master)](https://travis-ci.org/TuyaAPI/link) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
==============

A package for connecting a Tuya device to WiFi and the cloud. This package is split up into two sub-modules:
- **`(@tuyapi/link).manual`**: a low-level interface for linking devices.
- **`(@tuyapi/link).wizard`**: a wrapper that combines `(@tuyapi/link).manual` and `@tuya/tuya-connector-nodejs`, making it super easy to link devices. It Just Works™️.

## Installation
`npm i @tuyapi/link`

## Usage
```javascript
const TuyaLink = require('@tuyapi/link');

const register = new TuyaLink.wizard({apiKey: '01010101010101010101',
                                      apiSecret: '01010101010101010101010101010101',
                                      email: 'example@example.com', password: 'example-password'});

register.init().then(async () => {
  let devices = await register.linkDevice({ssid: 'Example-SSID', wifiPassword: 'examplepassword'});
  console.log(devices);
});
```

[Documentation](https://tuyaapi.github.io/link/)

## Development
1. After cloning, run `npm i`.
2. Create a file called `dev.js` as a playground. Since `dev.js` is in `.gitignore`, it won't be committed.
3. To run tests, run `npm test`.
4. To build documentation, run `npm run document`.

[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)
