// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

var events = require('events');
var util = require('util');


/**
 * Configuration
 */

// Datasheet: http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf

var
  RH_HOLD = 0xE5,
  RH_NOHOLD = 0xF5,
  TEMP_HOLD = 0xE3,
  TEMP_NOHOLD = 0xF3,
  TEMP_PREV = 0xE0,
  RESET = 0xFE,
  WRITE_USER_REG = 0xE6,
  READ_USER_REG = 0xE7,
  READ_IDh = [0xFA, 0x0F],
  READ_IDl = [0xFC, 0xC9],
  READ_FIRMWARE = [0x84, 0xB8],

/* Coefficients */
  TEMPERATURE_OFFSET = 46.85,
  TEMPERATURE_SLOPE = 175.72/65536,
  HUMIDITY_OFFSET = 6,
  HUMIDITY_SLOPE = 125/65536,

  WAKE_UP_TIME  = 15,

/* Constants */
  I2C_ADDRESS = 0x40,
  DATAh = 0x01, // Relative Humidity or Temperature, High Byte
  DATAl = 0x02; // Relative Humidity or Temperature, Low Byte

  HTRE = 0x04; // heater flag

/**
 * ClimateSensor
 */

function ClimateSensor (hardware) {
  this.hardware = hardware;

  // I2C object for address
  this.i2c = this.hardware.I2C(I2C_ADDRESS);

  var self = this;

  setTimeout(function () {
    self._readRegister(READ_IDl, 6, function(err, data){
      if (data[0] == 0x14) { // 0x14 identifies si7020 according to the datasheet
        self.emit('ready');
      } else {
        self.emit('error', new Error('Cannot connect to Si7020. Are you sure it\'s not a Si7005? Got id: ' + data[0].toString(16)));
      }
    });
  }, WAKE_UP_TIME);
}

util.inherits(ClimateSensor, events.EventEmitter);

ClimateSensor.prototype._readRegister = function (data, num, next) {
  this.i2c.transfer(new Buffer(data), num, function (err, ret) {
    if (next) {
      next(err, ret);
    }
  });
};

ClimateSensor.prototype._writeRegister = function (data, next) {
  this.i2c.send(new Buffer(data), next);
};

ClimateSensor.prototype.getData = function (configValue, next) {

  var cmd = [configValue];
  //  Wait until the chip wakes up
  var self = this;
  setTimeout(function () {
    self._writeRegister(cmd, function () {
      setImmediate(function untilready () {
        self._readRegister([], 3, function (err, data) {
          next(err, data);
        });
      });
    });
  }, WAKE_UP_TIME);
};

ClimateSensor.prototype.readHumidity = function (next) {
  /**
  Read and return the relative humidity

  Args
    next
      Callback; gets err, relHumidity as args
  */
  var self = this;
  this.getData(RH_HOLD, function (err, reg) {
    var rawHumidity = (reg[0] << 8) + reg[1];
    var humidity = ( rawHumidity * HUMIDITY_SLOPE ) - HUMIDITY_OFFSET;

    if (next) {
      next(null, humidity);
    }
  });
};

ClimateSensor.prototype.readTemperature = function (/*optional*/ type, next) {
  /**
  Read and return the temperature. Celcius by default, Farenheit if type === 'f'

  Args
    type
      if type === 'f', use Farenheit
    next
      Callback; gets err, temperature as args
  */
  next = next || type;

  var self = this;
  this.getData(TEMP_HOLD, function (err, reg) {
    var rawTemperature = (reg[0] << 8) + reg[1];
    var temp = ( rawTemperature * TEMPERATURE_SLOPE ) - TEMPERATURE_OFFSET;

    if (type === 'f') {
      temp = temp * (9/5) + 32;
    }

    next(null, temp);
  });
};

ClimateSensor.prototype.setHeater = function (status, next) {
  /**
  Turn the chip's internal heater on or off. Enabling the heater will drive
  condensation off of the sensor, thereby reducing its hysteresis and allowing
  for more accurate humidity measurements in high humidity conditions.

  Note that this will interfere with (raise) temperature mesurement.

  Args
    status
      true = heater on, false = heater off
  */
  var reg = 0;
  if (status) {
    reg = HTRE;
  } 

  // now write the user config register
  var self = this;

  self._writeRegister([READ_USER_REG], function(){
    self._readRegister([], 1, function(err, data){
      reg |= data[0];
      if (!status){
        reg &= ~(1 << 2);
      }
      self._writeRegister([WRITE_USER_REG, reg], function(){
        next && next();
      });
    });
  });
};


/**
 * Module API
 */

exports.ClimateSensor = ClimateSensor;

exports.use = function (hardware) {
  return new ClimateSensor(hardware);
};
