var Inbox = require('inbox');
var _ = require("lodash");
var MailParser = require("mailparser").MailParser;
var nodemailer = require("nodemailer");

/**
 * Surelia class
 * https://github.com/andris9/inbox#create-new-imap-connection
 */
function Surelia(port, host, options) {
    if (!(this instanceof Surelia)) return new Surelia(port, host, options);
    this.name = "surelia";
    this.client = Inbox.createConnection(port, host, options);
}

Surelia.prototype.connect = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.connect();
        self.client.on("connect", callback);
        self.client.on("error", callback);
    }
};

Surelia.prototype.listMailboxes = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.listMailboxes(callback);
    }
};

Surelia.prototype.listEmails = function (ctx, options) {

    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.listMessages(options.from, options.limit, callback);
        });
    }
};

Surelia.prototype.markRead = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.addFlags(options.uid, ["\\Seen"], callback)
        });
    }
};

Surelia.prototype.markUnread = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.removeFlags(options.uid, ["\\Seen"], callback)
        });
    }
};

Surelia.prototype.deleteEmail = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.deleteMessage(options.uid, callback)
        });
    }
};

Surelia.prototype.readEmailRaw = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            var chunks = [],
                chunklength = 0,
                messageStream = self.client.createMessageStream(options.uid);
            messageStream.on("data", function (chunk) {
                chunks.push(chunk);
                chunklength += chunk.length;
            });
            messageStream.on("end", function () {
                var result = Buffer.concat(chunks, chunklength).toString();
                callback(null, result);
            });
            messageStream.on("error", function (err) {
                callback(err);
            });
        });
    }
};

Surelia.prototype.sendEmail = function (ctx, options) {
    var self = this;
    this.smtpTransport = nodemailer.createTransport(options.protocol, options);
    return function (callback) {
        self.smtpTransport.sendMail(options.mailOptions, function(error, response){
            if(error){
                callback(error);
            }else{
                callback(null, response);
            }

            self.smtpTransport.close();
        });
    }
};


Surelia.prototype.readEmail = function (ctx, options) {
    var self = this;
    return function (callback) {
        var mailparser = new MailParser({
            streamAttachments: true
        });


        self.client.openMailbox(options.path, options.readOnly, function () {
            var chunks = [],
                chunklength = 0,
                messageStream = self.client.createMessageStream(options.uid);
            messageStream.on("data", function (chunk) {
                chunks.push(chunk);
                chunklength += chunk.length;
            });
            messageStream.on("end", function () {
                var result = Buffer.concat(chunks, chunklength).toString();
                mailparser.write(result);

                mailparser.on("end", function (mailObject) {
                    callback(null, mailObject);
                });

                mailparser.end();
            });
        });
    }
};

module.exports = Surelia;
