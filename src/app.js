var express = require('express');
var path = require('path');
var osprey = require('osprey');
var spheron = require('spheron');

var app = module.exports = express();

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.compress());
app.use(express.logger('dev'));

app.set('port', process.env.PORT || 3000);

var spheroPort = '/dev/cu.Sphero-RWB-RN-SPP';
var _sequenceId = 1;
var packetHandlers = {};
var sphero = spheron.sphero();

api = osprey.create('/api', app, {
  ramlFile: path.join(__dirname, '/assets/raml/api.raml'),
  logLevel: 'debug'  //  logLevel: off->No logs | info->Show Osprey modules initializations | debug->Show all
});

function registerPacketHandler(callback)
{
    var seqId = _sequenceId++;
    packetHandlers[seqId] = callback;
    return seqId;
}
sphero.on('packet', function (packet)
{
    var seqId = packet.SEQ;
    console.log('Spheron fired SEQ: ' + seqId);
    if (seqId in packetHandlers)
    {
        packetHandlers[seqId](packet);
        delete packetHandlers[seqId];
    }
});

function start()
{
    // Start sphero communications:
    sphero.on('open', function()
    {
        sphero.setInactivityTimeout(60000);
        // Visually indicate the sphero is responsive:
        sphero.setRGB(0xFF00FF, true);
    });
    sphero.open(spheroPort);

}

// Adding business logic to a valid RAML Resource
api.get('/color', function(req, res) {
    var seqId = _sequenceId++;
    packetHandlers[seqId] = function (packet)
    {
        var colorInHex = packet.DATA.toString('hex');
        res.send({ color: '0x' + colorInHex.toUpperCase() });
    };
    sphero.getRGB({ requestAcknowledgement: true, SEQ: seqId });
});


api.put('/color', function(req, res) {
    var seqId = _sequenceId++;
    packetHandlers[seqId] = function (packet)
    {
        var colorInHex = packet.DATA.toString('hex');
        res.send({ color: '0x' + colorInHex.toUpperCase() });
    };
    sphero.setRGB(req.body.color, true);
    sphero.getRGB({ requestAcknowledgement: true, SEQ: seqId });
});

api.put('/motion', function(req, res) {
    var seqId = _sequenceId++;
    packetHandlers[seqId] = function (packet)
    {
        res.send({heading: req.body.heading, speed: req.body.speed, state: req.body.state});
    };
    sphero.roll(req.body.speed,req.body.heading,req.body.state);
    sphero.getRGB({ requestAcknowledgement: true, SEQ: seqId });
});

api.put('/backLed', function(req, res) {
    var seqId = _sequenceId++;
    packetHandlers[seqId] = function (packet)
    {
        res.send({value: req.body.value});
    };
    sphero.setBackLED(req.body.value);
    sphero.getRGB({ requestAcknowledgement: true, SEQ: seqId });
});

start();

if (!module.parent) {
  var port = app.get('port');
  app.listen(port);
  console.log('listening on port ' + port);
}

