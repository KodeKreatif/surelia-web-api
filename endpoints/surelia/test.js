var request = require ("supertest").agent;
var async = require ("async");
var qsify = require ("koa-qs");
var HoodieCrow = require ("hoodiecrow");


var imapServer;

var _ = require ("lodash");
var policy = require ("../../policy");

try {
var userData = require("./user-test.json");
} catch(e) {
  var userData = {
    "imap": {
    "host": "localhost",
    "user": "testuser",
    "pass": "testpass"
    },
    "smtp": {
    "host": "host.com",
    "user": "",
    "pass": ""
    }
  }
}


// index
var index = __dirname + "/../../index.js";
// related options for api
var options = {
  root : index + "/endpoints", // the app index
  db : "mongodb://localhost/test", // the db uri
  driver : require ("mongoose"), // the driver
  imapConfig : userData.imap,
  smtpConfig : {
    host: userData.smtp.host,
    options: {
      secureConnection: true,
      auth: {
        user: userData.smtp.user,
        pass: userData.smtp.pass,
      }
    }
  }
}

options =_.merge(policy, options);

var app = qsify(require(index)(options));
app.on("error", function(err){console.log(err.stack)})

var toServer = function (){ return app.listen()}


before(function(done){
  imapServer = HoodieCrow();
  imapServer.listen(1143);
  done();
});

after(function(done){
  imapServer.close(done);
});

describe ("Surelia", function (){

  it ("Authenticate", function (done){

    // GET
    var uri = "/api/1/surelia/authenticate";

    var data = {
      user: userData.imap.user,
     pass: userData.imap.pass
    };
    request (toServer())
    .post (uri)
    .send (data)
    .expect (200)
    .end(function (err, res){
      done(err);
    });
  });

  it ("Get boxes", function (done){

    // GET
    var uri = "/api/1/surelia/boxes";

    request (toServer())
    .get (uri)
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  var uploadedEmail;
  it ("Upload an email into a box", function (done){

    var uri = "/api/1/surelia/boxes/INBOX";
    var data = {
      message: "From: test@test.com\nTo: test2@test2.com\nSubject: Test\n\nMessage"
    };

    request (toServer())
    .put(uri)
    .send(data)
    .expect (200)
    .end(function (err, res){
     
      uploadedEmail = res.body.data.uid;
      
      done(err);
    });

  });



  it ("Get emails in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX?limit=1";

    request (toServer())
    .get (uri)
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  it ("Read an email in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail;

    request (toServer())
    .get (uri)
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  it ("Read a raw email in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail + "/raw";

    request (toServer())
    .get (uri)
    .expect (200)
    .expect ("Content-Type", /text\/plain/)
    .end(function (err, res){
      done(err);
    });
  });

  it ("Read an email's headers in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail + "/headers";

    request (toServer())
    .get (uri)
    .expect (200)
    .end(function (err, res){
      done(err);
    });
  });

  it ("Flag an email in a box with read flag", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail;

    request (toServer())
    .put (uri)
    .send({flag: "\Seen"})
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  it ("Unflag the read flag from an email in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail;

    request (toServer())
    .put (uri)
    .send({unflag: "\Seen"})
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  it ("Delete an email in a box", function (done){

    // GET
    var uri = "/api/1/surelia/boxes/INBOX/" + uploadedEmail;

    request (toServer())
    .del (uri)
    .expect (200)
    .end(function (err, res){
      done(err);
    });

  });

  var draftId;
  it ("Compose a new email", function (done){

    var uri = "/api/1/surelia/drafts";
    var data = {
      message: "From: test@test.com\nTo: test2@test2.com\nSubject: Test\n\nDraft Message"
    };

    request (toServer())
    .put(uri)
    .send(data)
    .expect (200)
    .end(function (err, res){
     
      draftId = res.body.data.uid;
      
      done(err);
    });

  });


  it ("Update draft email", function (done){

    var uri = "/api/1/surelia/drafts/" + draftId;
    var data = {
      message: "From: test@test.com\nTo: mdamt@mnots.eu\nSubject: Test\n\nDraft Message " + (new Date)
    };

    request (toServer())
    .put(uri)
    .send(data)
    .expect (200)
    .end(function (err, res){
     
      draftId = res.body.data.uid;
      
      done(err);
    });

  });


  it ("Send the draft email", function (done){

    var uri = "/api/1/surelia/drafts/" + draftId;

    request (toServer())
    .post(uri)
    .send({draftId: draftId})
    .expect (200)
    .end(function (err, res){
     
      
      done(err);
    });

  });





});
