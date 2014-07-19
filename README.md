# Climate

Driver for the climate-si7020 Tessel climate module ([Si7020](http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf)).

**Not to be confused with the [climate-si7005](https://github.com/tessel/climate-si7005) Tessel climate module**

## Hardware overview/setup

The module may come with a protective white cover over the sensor, as shown in the image below. This cover is permeable and does *not* need to be removed before use. If the protective cover is removed, avoid touching, poking, or dirtying the exposed silicon die.

![Climate module with protective cover still in place](https://s3.amazonaws.com/technicalmachine-assets/doc+pictures/climate-si7020.jpg)

##Installation
```sh
npm install climate-si7020
```
##Example
```js
var tessel = require('tessel');
var climatelib = require('climate-si7020');
var climate = climatelib.use(tessel.port['A']);

climate.on('ready', function(){
  setInterval(function(){
    climate.readHumidity(function(err, humid){
      climate.readTemperature('f', function(err, temp){
        console.log('Degrees:', temp.toFixed(4) + 'F', 'Humidity:', humid.toFixed(4) + '%RH');
      });
    });
  }, 1000);
});

climate.on('error', function(err) {
  console.log('error connecting module', err);
});
```

## Methods

*  **`climate`.connect(interface[, csn])**
Takes in the port bank that the module is connected to. Returns the Climate object.

*  **`climate`.readTemperature([format,] callback(err, temp))**
Returns the temperature in degrees Celcius or Fahrenheit.

*  **`climate`.readHumidity(callback(err, humidity))** Returns the relative humidity.

*  **`climate`.setHeater(bool[, callback(err)])** Sets the HEAT config register. 
The heater evaporates off any moisture that may condense on the sensor in high humidty environments. Enabling the heater will increases the accuracy of humidity measurements but will interfere with temperature measurement.
According to section 5.1.4 of the [datasheet](http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf)
> Turning on the heater will reduce the tendency of the humidity sensor to accumulate an offset due to “memory” of sustained high humidity conditions. When the heater is enabled, the reading of the on-chip temperature sensor will be affected (increased).


*  **`climate`.setFastMeasure(bool[, callback(err)])** Sets the FAST config register. According to section 5.1.3 of the [datasheet](http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf)
> Fast mode reduces the total power consumed during a conversion or the average power consumed by the Si7005 when making periodic conversions. It also reduces the resolution of the measurements.

    | Normal | Fast
--- | --- | ---
converstion time | 35ms | 18ms
temp resolution | 14 bit | 13 bit
humidity resolution | 12 bit | 11 bit

## References

* [Si7020 datasheet](http://www.silabs.com/Support%20Documents/TechnicalDocs/Si7020.pdf)

## License

MIT/Apache, your pick
