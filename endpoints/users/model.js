var changeCase = require ("change-case");
var helper = require ("panas").helper;
var mongoose = require ("mongoose");
var thunkified = helper.thunkified;
var async = require ("async");
var _ = require ("lodash");
var boom = helper.error;

var ResourceUser = require ("../../resources/user");
var Model = ResourceUser.schemas;
var Enums = ResourceUser.enums;

var LIMIT = 10;
var SUFFIX = "@rockybars.com"

function isValidObjectId(str) {
  // coerce to string so the function can be generically used to test both strings and native objectIds created by the driver
  str = str + "";
  var len = str.length, valid = false;
  if (len == 12 || len == 24) {
    valid = /^[0-9a-fA-F]+$/.test(str);
  }
  return valid;
}

/**
 * User class
 */
function User (options) {
  if (!(this instanceof User)) return new User(options);
  this.name = "user";
}

User.prototype.find = function (ctx, options, cb) {

  var qs = ctx.query;

  // skip, limit, sort
  var skip = qs.skip || 0;
  var limit = qs.limit || LIMIT;
  var sort = qs.sort || { _id : -1 };

  // like or exact
  var like = qs.like || {};
  var exact = qs.exact || {};

  // expand
  var expand = qs.expand || [];
  var omit = "-secret -hash -salt -__v -log";

  // for custom operation
  var operator = qs.operator || false;
  var operation = operator && qs.operation ? qs.operation : [];

  var query = {};

  if (!operator) {

    for (var key in like) {
      query [key] = new RegExp(like[key], "i");
    }

    for (var key in exact) {
      query [key] = exact[key];
    }

  } else {
    // custom operation
    var criterias = [];
    _.map(operation, function (oper){
      var obj = {};
      for (var key in oper) {
        obj[key] = new RegExp(oper[key], "i");
      }
      criterias.push(obj);
    });
    query["$" + operator] = criterias;
  }

  if (options.and) {
    query = { $and : [ query, options.and ]};
  }

  var task = Model.User.find(query, omit);
  var paths = Model.User.schema.paths;
  var keys = Object.keys(paths);

  task.skip (skip);
  task.limit (limit);
  task.sort (sort);

  for (var i = 0; i < expand.length; i++) {
    var key = changeCase.camelCase(expand[i]);

    if (paths[key]) {
      var options = paths[key].options || {};
      if ( typeof options.type == typeof ObjectId 
        || typeof options.ref == "string"){
        task.populate(key, "-__v -_w");
      }
    }
  }

  var promise = task.exec();
  promise.addErrback(cb);
  promise.then(function(retrieved){
    Model.User.count(query, function(err, total){
      if (err) return cb (err);
      var obj = {
        object : "list",
        total : total,
        count : retrieved.length,
        data : retrieved
      }
      cb (null, obj);
    });
  }, function(err){
    cb (boom.badRequest(err.message));
  });
}

User.prototype.findOne = function (ctx, options, cb) {

  var self = this;
  var id = ctx.params.id;
  var qs = ctx.query;

  var _id;
  var email;
  var query;

  // expand
  var expand = qs.expand || [];
  var omit = "-hash -salt -__v -log";

  if (isValidObjectId(id)) {
    _id = mongoose.Types.ObjectId(id);
    query = { _id : _id };
  } else {
    query = { email : id + SUFFIX};
  }

  var task = Model.User.findOne(query, omit);
  var paths = Model.User.schema.paths;
  var keys = Object.keys(paths);

  for (var i = 0; i < expand.length; i++) {
    var key = expand[i];

    if (paths[key]) {
      var options = paths[key].options || {};
      if ( typeof options.type == typeof ObjectId 
        || typeof options.ref == "string"){
        task.populate(expand[i], "-__v -_w");
      }
    }
  }

  var promise = task.exec();
  promise.addErrback(cb);
  promise.then(function(retrieved){
    var obj = { object : "user"};
    obj = _.merge(obj, retrieved.toJSON());
    cb (null, obj);
  }, function(err){
    cb(boom.badRequest(err.message));
  });

}

User.prototype.create = function (ctx, options, cb) {
  
  var body = options.body;
  Model.User.register (body, function (err, data){
    
    if (err) {
      return cb (err);
    }

    if (!data) {
      return cb (boom.badRequest("no data"));
    }

    var object = {
      object : "user",
    }

    var omit = ["hash", "log"];
    object = _.merge(object, data.toJSON());
    object = _.omit (object, omit);
    return cb (null, object);

  });
}

User.prototype.update = function (ctx, options, cb) {
  
  var body = options.body;
  var id = ctx.params.id;

  Model.User.findById(id, function(err, data){
    if (err) {
      return cb (err);
    }

    if (!data) {
      return cb (boom.badRequest("no data"));
    }

    for (var k in body) {
      data[k] = body[k];
    }

    delete data.log;

    data.save(function (err, data){

      if (err) return cb (err);

      var object = {
        object : "user",
      }

      var omit = ["hash", "log"];
      object = _.merge(object, data.toJSON());
      object = _.omit (object, omit);
      return cb (null, object);

    });
  });
}


User.prototype.activate = function (ctx, options, cb) {
  
  var body = options.body || {};
  var params = ctx.params || [];

  var secret = body.secret || params.secret;

  Model.User.activate (secret, function (err, data){
    
    if (err) {
      return cb (err);
    }

    if (!data) {
      return cb (boom.badRequest("no data"));
    }

    var object = {
      object : "user",
      _id : data._id,
      state : data.state
    }

    return cb (null, object);

  });
}

User.prototype.authenticate = function (ctx, options, cb) {

  var self = this;
  var body = options.body;
  var username = body.email;
  var password = body.password

  Model.User.authenticate (username, password, function (err, authenticated) {

    if (err) {
      return cb (err);
    }

    if (!authenticated) {
      return cb (boom.unauthorized ("not authenticated")); 
    }

    self.decorate(ctx, authenticated, cb);
  });
}

User.prototype.decorate = function(ctx, user, cb){
  var obj = { object : "user" };
  obj = _.merge(obj, user.toJSON());
  obj.roles = user.roles;
  cb (null, obj);
}

module.exports = thunkified (User());
