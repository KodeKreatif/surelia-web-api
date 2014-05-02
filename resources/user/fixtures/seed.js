// insert admin only
var mongoose = require ("mongoose");
mongoose.connect ("mongodb://localhost/test");

var schemas = require ("../schemas");
var User = schemas.User;

User.remove(function(){
  var user = {
    email : "admin@rockybars.com",
    password : "test12345",
    name : "Admin",
    roles : ["admin"]
  };

  User.register(user, function(err, registered){
    if (err) throw err;
    User.activate(registered.secret, function(err, activated){
      if (err) throw err;
      console.log ("admin@rockybars.com is created", user.password);
      mongoose.disconnect();
    });
  });
});
