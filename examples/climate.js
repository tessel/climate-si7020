// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
This basic climate example logs a stream
of temperature and humidity to the console.
*********************************************/

const { promisify } = require('util');
const tessel = require('tessel');
const climatelib = require('./module');
const climate = climatelib.use(tessel.port['A']);

const setHeater = promisify(climate.setHeater).bind(climate);
const readHumidity = promisify(climate.readHumidity).bind(climate);
const readTemperature = promisify(climate.readTemperature).bind(climate);

climate.on('ready', async () => {
  console.log("Connected to si7020");

  console.log('Turning on the heater');
  await setHeater(true);

  setInterval(async () => {
    const [humidity, temp] = await Promise.all([
      readHumidity(),
      readTemperature('f'),
    ]);

    console.log(`Degrees: ${temp.toFixed(4)}\n Humidity: ${humidity.toFixed(4)}%RH`);
      /*
    climate.readHumidity((_, humid) => {
      climate.readTemperature('f', function(err, temp){
        console.log('Degrees:', temp.toFixed(4) + 'F', 'Humidity:', humid.toFixed(4) + '%RH');
      });
    });
    */
  }, 1000);
});

climate.on('error', (error) => {
  console.log('error connecting module', error);
});
