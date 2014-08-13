var helper = require ("panas").helper;
var boom = helper.error;
var thunkified = helper.thunkified;
var _ = require ("lodash");
var boom = helper.error;
var mailer = require("simplesmtp");
var MailParser = require("mailparser").MailParser;

/**
 * Surelia class
 */
function Surelia (options) {
  this.options = options;
  if (!(this instanceof Surelia)) return new Surelia(options);
  this.name = "surelia";
}

Surelia.prototype.authenticate = function (ctx, options, cb) {
  var self = this;
  console.log("Connecting to IMAP");
  var user = options.body.user;
  var pass = options.body.pass;
  ctx.imapManager.get({
    server: self.options.imapConfig.host,
    port : self.options.imapConfig.port,
    secure : self.options.imapConfig.secure,
    auth: {
      user: user,
      pass: pass
    },
    user: user 
  },function(err, client) {
    if (err) {
      return cb(err);
    }
    var p = function * (next) {
      this["imapUser"] = user;
      yield next;
    }
    ctx.app.middleware.unshift(p);
    console.log("Connected");
    cb(null, {});
  });
}

Surelia.prototype.getClient = function (ctx, options, cb) {
  var user = ctx.imapUser || ctx.session.user._id;
  var client = ctx.imapManager.connections[user];
  if (!client) {
    throw (boom.forbidden("Login required"));
  }
  return client;
}

Surelia.prototype.listMailboxes = function (ctx, options, cb) {
  var client = this.getClient(ctx, options, cb);
  var specials = {};
  var specialBoxes = ["Drafts", "Sent", "Spam", "Inbox", "Trash"];

  client.listMailboxes(function(err, mboxes) {
    var total = mboxes.length;
    if (total == 0) {
      return cb(null, { type: "list", data: [], count: 0});
    }

    var getChildren = function(index, cb) {
      if (index < 0) return cb();

      var mbox = mboxes[index]; 
      if (mbox.hasChildren) {
        mbox.listChildren(function(err, children) {
          mbox.children = children;
          _.each(children, function(child) {
            _.each(specialBoxes, function(specialBox, index) {
              if (child.type && child.type == specialBox) {
                specials[specialBox] = child.path;
                specialBoxes.splice(index, 1);
              }
            });
          });

          getChildren(index - 1, cb);
        });
      } else {
        getChildren(index - 1, cb);
      }

      _.each(specialBoxes, function(specialBox, index) {
        if (mbox.type && mbox.type == specialBox) {
          specials[specialBox] = mbox.path;
          specialBoxes.splice(index, 1);
        }
      });
    }

    getChildren(total - 1, function() {
      // Expose special boxes
      var p = function * (next) {
        this["imapSpecialBoxes"] = specials;
        yield next;
      }
      ctx.app.middleware.unshift(p);

      cb (null, {
        type: "object",
         all: mboxes,
        specials : specials 
      });
    });
  });
}

Surelia.prototype.getMailboxName = function(name) {
  if (name) {
    return name.replace(/\|/, "/");
  }
}

Surelia.prototype.listEmails = function (ctx, options, cb) {
  var client = this.getClient(ctx, options, cb);
  var mailbox = this.getMailboxName(ctx.params.id);
  mailbox = this.getMailboxName(mailbox);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }
    var from = ctx.query.from || 0;
    var limit = ctx.query.limit || 20;
    client.listMessages(from, limit, function(err, mbox) {
      if (err) {
        return cb(err);
      }
      cb (null, {
        type: "list",
         data: mbox,
         count: mbox.length,
         total: mboxInfo.count
      });
    });
  });
}

Surelia.prototype.uploadEmail = function (ctx, options, cb) {
  var mailbox = options.mailbox || ctx.params.id;
  mailbox = this.getMailboxName(mailbox);
  var client = this.getClient(ctx, options, cb);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }
    client.storeMessage(options.body.message, function(err, result) {
      if (err) {
        return cb(err);
      }
      cb (null, {
        type: "email",
          data: {
            mailbox: mailbox,
            uid: result.UID,
            uidValidity: result.UIDValidity,
          }
      });
    });
  });
}

Surelia.prototype.readEmail = function (ctx, options, cb) {
  var client = this.getClient(ctx, options, cb);
  var mailbox = this.getMailboxName(ctx.params.id);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }
    var parser = new MailParser();
    parser.on("end", function(message) {
      cb (null, {
        type: "email",
         data: message
      });
    });

    var stream = client.createMessageStream(ctx.params.emailId);
    stream.pipe(parser);
  });
}

Surelia.prototype.manageFlag = function (ctx, options, cb) {
  var client = this.getClient(ctx, options, cb);
  var mailbox = this.getMailboxName(ctx.params.id);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }

    var result = function(err, message) {
      if (err) {
        return cb(err);
      }
      var returnValue = {
        type: "email",
        data: {
          mailbox: mailbox,
          uid: ctx.params.emailId
        }
      };
      if (options.body.unflag) {
        returnValue.data.unflag = options.body.unflag; 
      } else {
        returnValue.data.flag = options.body.flag; 
      }
      cb (null, returnValue);
    }

    if (options.body.unflag) {
      client.removeFlags(ctx.params.emailId, options.body.flag, result);
    } else {
      client.addFlags(ctx.params.emailId, options.body.flag, result);
    }

  });
}

Surelia.prototype.deleteEmail = function (ctx, options, cb) {
  var mailbox = options.mailbox || ctx.params.id;
  mailbox = this.getMailboxName(mailbox);
  var draftId = options.draftId || ctx.params.emailId;
  var client = this.getClient(ctx, options, cb);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }

    client.deleteMessage(draftId, function(err) {
      if (err) {
        return cb(err);
      }

      return cb(null, {});
    });

  });

}

Surelia.prototype.readEmailRaw = function (ctx, options, cb) {
  var mailbox = options.mailbox || ctx.params.id;
  mailbox = this.getMailboxName(mailbox);
  var emailId = options.emailId || ctx.params.emailId;

  var client = this.getClient(ctx, options, cb);
  console.log(options);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }

    var stream = client.createMessageStream(emailId);
    if (options.directReturn) {
      console.log("ret");
      return cb(null, stream);
    } 
    ctx.type = "text/plain";
    ctx.status = 200;
    cb(null, stream);
  });
}

Surelia.prototype.readHeaders = function (ctx, options, cb) {
  var mailbox = options.mailbox || ctx.params.id;
  mailbox = this.getMailboxName(mailbox);
  var emailId = options.emailId || ctx.params.emailId;
  var client = this.getClient(ctx, options, cb);
  console.log(options);
  client.openMailbox(mailbox, function(err, mboxInfo) {
    if (err) {
      return cb(err);
    }
    client.listMessagesByUID(emailId, emailId, function(err, mbox) {
      if (err) {
        return cb(err);
      }
      cb (null, {
        type: "email-header",
         data: mbox[0]
      });
    });
  });
}


Surelia.prototype.checkSpecialBoxes = function (ctx, options, cb) {
  var self = this;
  if (!ctx.imapSpecialBoxes) {
    self.listMailboxes(ctx, options, cb);
  } else {
    cb(null);
  }
}

Surelia.prototype.composeEmail = function (ctx, options, cb) {
  var self = this;
  self.checkSpecialBoxes(ctx, options, function() {
    var draft = ctx.imapSpecialBoxes["Drafts"];
    if (!draft) {
      throw (boom.internalServerError("Drafts folder is unavailable"));
    }

    options.mailbox = draft;
    self.uploadEmail(ctx, options, cb);
  });
}

Surelia.prototype.updateDraftEmail = function (ctx, options, cb) {
  var self = this;
  self.checkSpecialBoxes(ctx, options, function() {
    var draft = ctx.imapSpecialBoxes["Drafts"];
    if (!draft) {
      throw (boom.internalServerError("Drafts folder is unavailable"));
    }

    options.mailbox = draft;
    options.draftId = ctx.params.id;
    self.deleteEmail(ctx, options, function(err, result) {
      if (err) {
        return cb(err);
      }
      self.uploadEmail(ctx, options, cb);
    });
  });
}

Surelia.prototype.sendDraftEmail = function (ctx, options, cb) {
  var self = this;

  self.checkSpecialBoxes(ctx, options, function() {
    var client = self.getClient(ctx, options, cb);
    var draft = ctx.imapSpecialBoxes["Drafts"];
    var sent = ctx.imapSpecialBoxes["Sent"];
    if (!draft) {
      throw (boom.internalServerError("Drafts folder is unavailable"));
    }
    if (!sent) {
      throw (boom.internalServerError("Sent folder is unavailable"));
    }

    options.mailbox = draft;
    options.emailId = ctx.params.id;

    self.readHeaders(ctx, options, function(err, data) {
      if (err) {
        return cb(err);
      }
      var recipients = [];
      console.log(data);
      _.each(data.data.to, function(to) {
        recipients.push(to.address);
      });
      _.each(data.data.cc, function(cc) {
        recipients.push(cc.address);
      });

      var done = function() {
        client.openMailbox(draft, function(err, mboxInfo) {
          if (err) {
            return cb(err);
          }
          client.moveMessage(options.emailId, sent, function(err, result) {
            if (err) {
              return cb(err);
            }
            console.log("Moved");
            cb(null,{});
          });
        });
      }

      options.directReturn = true;
      var smtp = mailer.connect(self.options.smtpConfig.port, self.options.smtpConfig.host, self.options.smtpConfig.options);
        console.log("Start sending");
      smtp.once("idle", function() {
        smtp.useEnvelope({
          from: data.data.from.address,
          to: recipients
        });
      });
      smtp.on("message", function() {
        console.log("Sending");
        var stream = client.createMessageStream(options.emailId);
        stream.pipe(smtp);
      });
      smtp.on("ready", function() {
        console.log("Done");
        done();
      });
      smtp.on("error", function(err) {
        cb(err); 
      });
    });

  });
}

module.exports = function(options) {
  return thunkified (Surelia(options));
}
