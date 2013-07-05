var express = require("express");
var app = express();
var port = process.env.PORT || 5000;
var twilio = require('twilio');
var twilioClient = twilio('AC5176f9a3c768040fd0870342bbb2631e', '91fbafa8b064b3cd3bb9f3778d1b948b');
var mongo = require('mongodb');
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/mydb'; 

/*
mongo.Db.connect(mongoUri, function (err, db) {
  db.collection('mydocs', function(er, collection) {
    collection.insert({'mykey': 'myvalue'}, {safe: true}, function(er,rs) {
    });
  });
});
*/

app.use(express.logger());
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.send('Why are you looking here?');
});

// When Twilio recieves an SMS it hits this route and listens for a TwiML response
// http://www.twilio.com/docs/api/twiml
app.post('/sms', function(req, res) {
    var text = req.body.Body;
    var from = req.body.From;
    var smssid= req.body.SmsSid;
    var call = new twilio.TwimlResponse();

    call.say('Please hold for the Angrologist', {
        voice:'woman',
        language:'en-gb'
    })
    .pause({ length: 3 })
    .play('https://s3-us-west-2.amazonaws.com/angrologist/7-5-2013/horoscope.mp3');

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(call.toString());
});

// When Twilio recieves an phone call it hits this route and listens for a TwiML response
// http://www.twilio.com/docs/api/twiml
app.post('/voice', function(req, res) {
    var text = req.body.Body;
    var from = req.body.From;
    var smssid= req.body.SmsSid;
    var call = new twilio.TwimlResponse();

    call.say('Please hold for the Angrologist', {
        voice:'woman',
        language:'en-gb'
    })
    .pause({ length: 3 })
    .play('https://s3-us-west-2.amazonaws.com/angrologist/7-5-2013/horoscope.mp3');

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(call.toString());
});

app.listen(port, function() {
    console.log("Listening on " + port);
});
