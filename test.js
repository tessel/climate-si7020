var test = require('tape')
var tessel = require('tessel')
var series = require('async-series')

var lib = require('./')

test('Climate si7020', function (t) {
  t.plan(4)

  var firstTemp, heatedTemp
  var climate = lib.use(tessel.port['A'])

  series([
    function (cb) {
      climate.on('ready', cb)
    },
    function (cb) {
      climate.readHumidity(function (err, humid) {
        if (err) return cb(err)

        t.ok(humid >= 5 && humid <= 80, 'humid looks ok')
        cb(null)
      })
    },
    function (cb) {
      climate.readTemperature('c', function(err, temp) {
        if (err) return cb(err)

        firstTemp = temp
        t.ok(temp >= 5 && temp <= 40, 'temp looks ok')
        cb(null)
      })
    },
    function (cb) {
      climate.setHeater(true, function (err) {
        if (err) return cb(err)

        setTimeout(cb, 1000, null)
      })
    },
    function (cb) {
      climate.readTemperature('c', function (err, temp) {
        if (err) return cb(err)

        heatedTemp = temp
        t.ok(temp > firstTemp, 'heater works')
        cb(null)
      })
    },
    function (cb) {
      climate.setHeater(false, function (err) {
        if (err) return cb(err)

        setTimeout(cb, 1000, null)
      })
    },
    function (cb) {
      climate.readTemperature('c', function (err, temp) {
        if (err) return cb(err)

        t.ok(temp < heatedTemp, 'heater turns off')
        cb(null)
      })
    }
  ], function (err) {
    if (err) t.error(err)
  })
})
