var Inbox = require('inbox');
var _ = require("lodash");
var MailParser = require("mailparser").MailParser;

/**
 * Surelia class
 * https://github.com/andris9/inbox#create-new-imap-connection
 */
function Surelia(port, host, options) {
    if (!(this instanceof Surelia)) return new Surelia(port, host, options);
    this.name = "surelia";
    this.client = Inbox.createConnection(port, host, options);
    return this;
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

Surelia.prototype.listEmails = function (ctx, path, readOnly, from, limit) {

    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            self.client.listMessages(from, limit, callback);
        });
    }
};

Surelia.prototype.markRead = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            self.client.addFlags(uid, ["\\Seen"], callback)
        });
    }
};

Surelia.prototype.markUnread = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            self.client.removeFlags(uid, ["\\Seen"], callback)
        });
    }
};

Surelia.prototype.deleteEmail = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            self.client.deleteMessage(uid, callback)
        });
    }
};

Surelia.prototype.readEmailRaw = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            var chunks = [],
                chunklength = 0,
                messageStream = self.client.createMessageStream(uid);
            messageStream.on("data", function (chunk) {
                chunks.push(chunk);
                chunklength += chunk.length;
            });
            messageStream.on("end", function () {
                var result = Buffer.concat(chunks, chunklength).toString();
                callback(null, result);
            });
        });
    }
};

Surelia.prototype.readHeaders = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            self.client.fetchData(uid, callback);
        });
    }
};

Surelia.prototype.sendEmail = function* (ctx, options) {
    cb(null, {});
};



Surelia.prototype.readEmail = function (ctx, path, readOnly, uid) {
    var self = this;
    return function (callback) {
        self.client.openMailbox(path, readOnly, function () {
            var chunks = [],
                chunklength = 0,
                messageStream = self.client.createMessageStream(uid);
            messageStream.on("data", function (chunk) {
                chunks.push(chunk);
                chunklength += chunk.length;
            });
            messageStream.on("end", function () {
                var result = Buffer.concat(chunks, chunklength).toString();
                callback(null, result);
            });
        });
    }
};

module.exports = Surelia;
