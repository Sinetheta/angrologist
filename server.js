var q = require('q');
var url = require('url');
var express = require('express');
var app = express();
var request = require('request');
var domain = process.env.NODE_ENV === 'production'? 'http://floating-inlet-6714.herokuapp.com/': 'http://96.50.15.9:5000';
var port = process.env.PORT || 5000;
var twilio = require('twilio');
    // these keys are stored on the heroku server, and in an .env file for local dev
    twilio.sid = process.env.TWILIO_ACCOUNT_SID;
    twilio.token = process.env.TWILIO_AUTH_TOKEN;
    twilio.number = process.env.TWILIO_OUTGOING_NUMBER;
var twilioClient = twilio(twilio.sid, twilio.token);
var paypal_sdk = require('paypal-rest-sdk');
paypal_sdk.configure({
    'host': 'api.sandbox.paypal.com',
    'port': '',
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});
var mongoUri = process.env.MONGOLAB_URI || 
    'mongodb://localhost/angrologist';
var mongoose = require('mongoose');
    mongoose.connect(mongoUri);

var callSchema = new mongoose.Schema({
    to:  String,
    sign: String,
    status: String,
    recordingUrl: String,
    payment: mongoose.Schema.Types.Mixed,
    voice: mongoose.Schema.Types.Mixed,
    created: { type: Date, default: Date.now }
});
var Call = mongoose.model('Call', callSchema);

Call.prototype.telephone = function() {
    // initiate a phone call from Twilio
    // http://www.twilio.com/docs/api/rest/making-calls
    /*
    request.post('https://' + twilio.sid + ':' + twilio.token + '@api.twilio.com/2010-04-01/Accounts/' + twilio.sid + '/Calls', {
        form: {
            To: this.to,
            From: twilio.number,
            Url: domain + '/twilio/voice/' + this._id,
            Record: true,
            StatusCallback: domain + '/twilio/status/' + this._id
        }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    });
*/
    twilioClient.makeCall({
        to: this.to,
        from: twilio.number,
        url: domain + '/twilio/voice/' + this._id,
        record: true,
        statusCallback: domain + '/twilio/status/' + this._id
    }, function(err, call) {
        console.log('call sent to ' + call.to_formatted)
    });
}

Call.prototype.requestPayment = function() {
    var deferred = q.defer();
    var payment_details = {
        'intent': 'sale',
        'payer': {
            'payment_method': 'paypal'
        },
        'redirect_urls': {
            'return_url': domain + '/paypal/return/' + this._id,
            'cancel_url': domain + '/paypal/cancel/' + this._id
        },
        'transactions': [{
            'amount': {
                'currency': 'USD',
                'total': '1.00'
            },
            'description': 'A call from the Angrologist.'
        }]
    };

    // make a payment with Paypal API
    // https://runnable.com/UXgzNO_v2oZyAADG/make-a-payment-with-paypal-api-node-js
    paypal_sdk.payment.create(payment_details, function(error, payment){
        if(error){
            deferred.reject(error);
        } else {
            deferred.resolve(payment);
        }
    });

    return deferred.promise;
}

app.use(express.logger());
app.use(express.bodyParser());

// after successful payment Paypal will redirect users here
app.get('/paypal/return/:id', function(req, res) {
    var id = req.params.id
    var url_parts = url.parse(req.url, true);
    var token = url_parts.query.token;
    var payerID = url_parts.query.PayerID;

    Call.findById(id, function (err, call) {
        res.json({
            token: token,
            payerID: payerID,
            call: call
        });
    });

/*
    paypal_sdk.payment.execute("PAY-34629814WL663112AKEE3AWQ", { 'payer_id': payerID }, function(error, payment){
        if(error){
            console.error(error);
        } else {
            console.log(payment);
        }
    });

*/
});

app.get('/init/:sign/:number', function(req, res) {
    var sign = req.params.sign;
    var number = '+' + req.params.number;
    var call = new Call({
        to: number,
        sign: sign,
        donatedCents: 0
    });

    // TODO: to not just let the page hang while we wait for a round trip response from Paypal
    // what's a better way to handle this?
    call.requestPayment().then(function(payment) {
        console.log(payment);
        call.payment = payment;
        res.json({
            sign: sign,
            number: number,
            payment: payment
        });
        call.save();
    }, function() {
        // errback, executed on rejection
    }, function() {
        // progressback, executed if the promise has progress to report
    });
    //call.telephone();
});

app.get('/callnow/:sign/:number', function(req, res) {
    var sign = req.params.sign;
    var number = '+' + req.params.number;
    var call = new Call({
        to: number,
        sign: sign,
        donatedCents: 0
    });

    call.telephone();
    call.save();
});

// When Twilio makes a phone call it hits this route and listens for a TwiML response
// http://www.twilio.com/docs/api/twiml
app.post('/twilio/voice/:id', function(req, res, body) {
    var id = req.params.id

    Call.findByIdAndUpdate(id, {
        voice: req.body
    }, function(err, call) {
        var twiml = new twilio.TwimlResponse();

        twiml.say('Hello ' + call.sign + ', you have reached the Angrologist.', {
            voice:'woman',
            language:'en-gb'
        })
        .play('https://s3-us-west-2.amazonaws.com/angrologist/7-5-2013/horoscope.mp3');

        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
    });
});

// After a phone call Twilio will notify this URL
// http://www.twilio.com/docs/api/twiml/twilio_request#asynchronous
app.post('/twilio/status/:id', function(req, res) {
    var id = req.params.id;
    var url_parts = url.parse(req.url, true);

    Call.findByIdAndUpdate(id, {
        status: req.body.CallStatus,
        recordingUrl: req.body.RecordingUrl
    });
});

app.use(express.static('public'));

app.listen(port, function() {
    console.log('Listening on ' + port);
});
