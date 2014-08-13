var inbox = require ("inbox");

function ImapClientManager(options){
  if (!(this instanceof ImapClientManager)) return new ImapClientManager(options);
  // todo using getter, and not enumerable
  this.connections = {};
}

ImapClientManager.prototype.get = function(options, cb){

  var self = this;

  // options, contains user._id and imap credentials
  function connect(imapOpt, cb) {
    var client = inbox.createConnection(
      imapOpt.port, 
      imapOpt.server, 
      { secureConnection: imapOpt.secure || false, auth : imapOpt.auth});
    
    client.on("connect", function(){
      this.user = imapOpt.auth.user;
      cb (null, client);
    });

    client.on("error", function(err){
      console.log(err);
      cb (err);
    });

    client.connect();
  }

  if (this.connections[options.user]){
    return cb (null, this.connections[options.user]);
  }

  if (options.server && options.auth) {
    connect(options, function(err, client){
      if (err) return cb(err);
      self.connections[options.user] = client;
      cb(null, client);
    });

  } else {
    cb (null, null);
  }
};

module.exports = ImapClientManager;
