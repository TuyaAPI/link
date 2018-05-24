tuyapi/register [![Build Status](https://travis-ci.org/TuyaAPI/register.svg?branch=master)](https://travis-ci.org/TuyaAPI/register) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
==============

A package for connecting a Tuya device to WiFi and the cloud. This package is split up into two sub-modules:
- **`(@tuyapi/register).manual`**: this is a low-level interface for registering devices.
- **`(@tuyapi/register).wizard`**: this is a wrapper that combines `(@tuyapi/register).manual` and `@tuyapi/cloud`, making it super easy to register devices. It Just Works™️.

## Installation
`npm i @tuyapi/register`

## Usage
```javascript
const TuyaRegister = require('@tuyapi/register');

const register = new TuyaRegister.wizard({apiKey: '01010101010101010101',
                                          apiSecret: '01010101010101010101010101010101',
                                          email: 'example@example.com', password: 'example-password'});

register.init().then(() => {
  register.linkDevice({ssid: 'Example-SSID', wifiPassword: 'examplepassword'}).then(devices => {
    console.log(devices);
  });
});
```

[Documentation](https://tuyaapi.github.io/register/)

## Development
1. After cloning, run `npm i`.
2. Create a file called `dev.js` as a playground. Since `dev.js` is in `.gitignore`, it won't be committed.
3. To run tests, run `npm test`.
4. To build documentation, run `npm run document`.

[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)
