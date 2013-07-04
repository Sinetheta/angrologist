var express = require("express");
var app = express();
var port = process.env.PORT || 5000;
var twilio = require('twilio');
var twilioClient = twilio('AC5176f9a3c768040fd0870342bbb2631e', '91fbafa8b064b3cd3bb9f3778d1b948b');

app.use(express.logger());
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.send('Why are you looking here?');
});

app.post('/sms', function(req, res) {
    var challenge = new twilio.TwimlResponse();
    challenge.sms('body:' + req.body.body + ' from:' + req.body.from);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(challenge.toString());
});

app.get('/horoscope/:number', function(req, res) {
    var target = req.params.number;

    if(!target) res.send('No target');

    //Send an SMS text message
    twilio.sendSms({

        to: target, // Any number Twilio can deliver to
        from: '+16475578011', // A number you bought from Twilio and can use for outbound communication
        body: 'word to your mother.' // body of the SMS message

    }, function(err, responseData) { //this function is executed when a response is received from Twilio

        if (!err) { // "err" is an error received during the request, if any
            // "responseData" is a JavaScript object containing data received from Twilio.
            // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
            // http://www.twilio.com/docs/api/rest/sending-sms#example-1

            console.log('Sent text to ' + responseData.to); // outputs "Seding text to +14506667788"
            res.jsonp({target: target});
        }
    });
});

app.listen(port, function() {
    console.log("Listening on " + port);
});
