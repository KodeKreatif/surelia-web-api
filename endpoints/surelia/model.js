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
    if (_.isEmpty(options)) {
        options = { //detail https://github.com/andris9/inbox#create-new-imap-connection
            secureConnection: true,
            service: "Gmail",
            auth: {
                user: '',
                pass: ''
            },
            debug: false
        };
    }
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
        self.client.listMailboxes(function (err, mbox) {
            if (err) {
                callback(err);
            } else if (_.isArray(mbox)) {
                var retval = {
                    type: "list",
                    count: mbox.length,
                    data: mbox
                };
                callback(null, retval);
            } else {
                mbox = [];
                retval = {
                    type: "list",
                    count: mbox.length,
                    data: mbox
                };
                callback(null, retval);
            }
        });
    }
};

Surelia.prototype.listEmails = function (ctx, options) {

    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.listMessages(options.from, options.limit, function (err, messages) {
                if (err) {
                    callback(err);
                } else if (_.isArray(messages)) {
                    var retval = {
                        type: "list",
                        count: messages.length,
                        data: messages
                    };
                    callback(null, retval);
                } else {
                    messages = [];
                    retval = {
                        type: "list",
                        count: messages.length,
                        data: messages
                    };
                    callback(null, retval);
                }
            });
        });
    }
};

Surelia.prototype.markRead = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.addFlags(options.uid, ["\\Seen"], function (err, flags) {
                var retval = {
                    type: "object",
                    data: options.uid
                };
                callback(err, retval);
            });
        });
    }
};

Surelia.prototype.markUnread = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.removeFlags(options.uid, ["\\Seen"], function (err, flags) {
                var retval = {
                    type: "object",
                    data: options.uid
                };
                callback(err, retval);
            })
        });
    }
};

Surelia.prototype.deleteEmail = function (ctx, options) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(options.path, options.readOnly, function () {
            self.client.deleteMessage(options.uid, function (err, flags) {
                var retval = {
                    type: "object",
                    data: options.uid
                };
                callback(err, retval);
            })
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
                var retval = {
                    type: "object",
                    data: result
                };
                callback(null, retval);

            });
            messageStream.on("error", function (err) {
                callback(err);
            });
        });
    }
};

Surelia.prototype.sendEmail = function (ctx, options) {
    var self = this;
    this.smtpTransport = nodemailer.createTransport(options.protocol, options.transportOption);
    return function (callback) {
        self.smtpTransport.sendMail(options.mailOptions, function (error, response) {
            if (error) {
                callback(error);
            } else {
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

                    var retval = {
                        type: "object",
                        data: mailObject
                    };
                    callback(null, retval);
                });

                mailparser.end();
            });
        });
    }
};

Surelia.prototype.listAttachments = function* (ctx, options) {
    var retVal = yield this.readEmail(ctx, options);
    if (retVal.type === 'object') {
        var mailObject = retVal.data;
        if (!_.isEmpty(mailObject.attachments) && _.isArray(mailObject.attachments)) {
            return{
                type: 'list', count: mailObject.attachments.length, data: mailObject.attachments
            }
        } else {
            return {
                type: 'list', count: 0, data: []
            }
        }
    }
};

Surelia.prototype.streamAttachment = function* (ctx, options) {
    var retVal = yield this.readEmail(ctx, options);
    if (retVal.type === 'object') {
        var mailObject = retVal.data;
        if (!_.isEmpty(mailObject.attachments) && _.isArray(mailObject.attachments)) {
            var streamByIndex = mailObject.attachments[options.attachmentIndex];
            if(streamByIndex){
                return {type:'object',data: streamByIndex.stream}
            }else{
                return {type:'object',data:null}
            }
        } else {
            return {
                type: 'object', data: null
            }
        }
    }
};


module.exports = Surelia;
