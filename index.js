// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

const { EventEmitter } = require('events');

/**
 * Configuration
 */

// Datasheet: http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf

const
  RH_HOLD = 0xE5,
  RH_NOHOLD = 0xF5,
  TEMP_HOLD = 0xE3,
  TEMP_NOHOLD = 0xF3,
  TEMP_PREV = 0xE0,
  RESET = 0xFE,
  WRITE_USER_REG = 0xE6,
  READ_USER_REG = 0xE7,
  WRITE_HTRE_REG = 0x51;
  READ_HTRE_REG = 0x11;
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
  ID = 0x14, // identifies si2070 according to the datasheet
  I2C_ADDRESS = 0x40,
  DATAh = 0x01, // Relative Humidity or Temperature, High Byte
  DATAl = 0x02, // Relative Humidity or Temperature, Low Byte

  HTRE = 0x04; // heater flag

function noop() {}

/**
 * ClimateSensor
 */
class ClimateSensor extends EventEmitter {
  constructor(hardware) {
    super();
    this.hardware = hardware;

    this.i2c = this.hardware.I2C(I2C_ADDRESS);

    setTimeout(() => {
      this._readRegister(READ_IDl, 6, (_, data) => {
        if (data[0] == ID) {
          this.emit('ready');
        } else {
          this.emit('error', new Error(`Cannot connect to Si7020. Are you sure it's not a Si7005? Got id: ${data[0].toString(16)}`));
        }
      });
    }, WAKE_UP_TIME);
  }

  _readRegister(data, numberOfBytes, next = noop) {
    this.i2c.transfer(Buffer.from(data), numberOfBytes, next);
  }

  _writeRegister(data, next = noop) {
    this.i2c.send(Buffer.from(data), next);
  }

  getData(command, next) {
    setTimeout(() => {
      this._writeRegister([command], () => {
        this._readRegister([], 3, next);
      });
    }, WAKE_UP_TIME);
  }

  readHumidity(next = noop) {
    /**
    Read and return the relative humidity

    Args
      next
        Callback; gets error, relHumidity as args
    */
    this.getData(RH_HOLD, (error, register) => {
      if (error) {
        return next(error);
      }

      const rawHumidity = (register[0] << 8) + register[1];
      const humidity = (rawHumidity * HUMIDITY_SLOPE) - HUMIDITY_OFFSET;

      next(null, humidity);
    });
  }

  readTemperature(type, next) {
    /**
    Read and return the temperature. Celcius by default, Farenheit if type === 'f'

    Args
      type
        if type === 'f', use Farenheit
      next
        Callback; gets err, temperature as args
    */
    next = next || type;

    this.getData(TEMP_HOLD, (error, register) => {
      if (error) {
        return next(error);
      }

      const rawTemperature = (register[0] << 8) + register[1];
      let temp = (rawTemperature * TEMPERATURE_SLOPE) - TEMPERATURE_OFFSET;

      if (type === 'f') {
        temp = temp * (9/5) + 32;
      }

      next(null, temp);
    });
  }

  setHeater(status, next = noop) {
    /**
    Turn the chip's internal heater on or off. Enabling the heater will drive
    condensation off of the sensor, thereby reducing its hysteresis and allowing
    for more accurate humidity measurements in high humidity conditions.

    Note that this will interfere with (raise) temperature mesurement.

    Args
      status
        true = heater on, false = heater off
    */
    let register = status ? HTRE : 0;

    this._writeRegister([READ_USER_REG], () => {
      this._readRegister([], 1, (error, data) => {
        if (error) {
          return next(error);
        }

        register |= data[0];

        if (!status) {
          register &= ~(1 << 2);
        }

        this._writeRegister([WRITE_USER_REG, register], next);
      });
    });
  }
}

exports.ClimateSensor = ClimateSensor;
exports.use = (hardware) => new ClimateSensor(hardware);
