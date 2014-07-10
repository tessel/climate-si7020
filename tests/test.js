var tessel = require('tessel')
  , climate = require('./').use(tessel.port['A'])
  ;

var good = tessel.led[1].output().low();
var bad = tessel.led[2].output().low();
var ready = false;

function tempTest(){
  climate.readTemperature('f', function(err, noHeat){
    console.log('Degrees:', noHeat.toFixed(4));
    
    setTimeout(function(){
      climate.setHeater(true, function(){
        setTimeout(function(){
          climate.readTemperature('f', function(err, heatOn){
            console.log("turning on heater", heatOn.toFixed(4));

            if (noHeat > heatOn){
              return bad.high();
            } 

            climate.setHeater(false, function(){
              setTimeout(function(){
                climate.readTemperature('f', function(err, temp){
                  console.log('turning off heater:', temp.toFixed(4));

                  if (heatOn < temp){
                    return bad.high();
                  }
                  console.log("passed!");
                  return good.high();

                });
              }, 1000);
            });
          });
        }, 1000);
      });
      
          
    }, 1000);
  });
}

climate.on('ready', function(){
  ready = true;
  climate.readHumidity(function(err, humid){
    console.log("Humidity", humid.toFixed(4));

    if (humid < 5 || humid > 80){
      return bad.high();
    }

    tempTest();
  });
  
});

setTimeout(function(){
  if (!ready){
    bad.high();
  }
}, 3000);

process.ref();
