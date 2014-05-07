var Inbox = require('inboxthunks');
var _ = require("lodash");

/**
 * Surelia class
 * https://github.com/andris9/inbox#create-new-imap-connection
 */
function Surelia(port, host, options) {
    if (!(this instanceof Surelia)) return new Surelia(port, host, options);
    this.name = "surelia";
    this.client = Inbox.init(port, host, options);
    return this;
}

Surelia.prototype.connect = function* (ctx, options) {
    yield this.client.connect();
    return this;
};

Surelia.prototype.listMailboxes = function* (ctx, options) {
    return yield this.client.listMailboxes();
};

Surelia.prototype.listEmails = function* (ctx, options) {
    yield this.client.openMailbox(options.path, options.readOnly);
    return yield this.client.listMessages(options.from, options.limit);
};

Surelia.prototype.readEmail = function* (ctx, options) {
    yield this.client.openMailbox(options.path, options.readOnly);
    return yield this.client.fetchData(options.uid);
};

Surelia.prototype.markRead = function* (ctx, options) {
    cb(null, {});
}

Surelia.prototype.markUnread = function* (ctx, options) {
    cb(null, {});
}

Surelia.prototype.deleteEmail = function* (ctx, options) {
    cb(null, {});
}

Surelia.prototype.readEmailRaw = function* (ctx, options) {
    cb(null, {});
}

Surelia.prototype.readHeaders = function* (ctx, options) {
    cb(null, {});
}

Surelia.prototype.sendEmail = function* (ctx, options) {
    cb(null, {});
}

module.exports = Surelia;
