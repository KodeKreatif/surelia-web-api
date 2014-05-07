var Surelia = require("./model");
var co = require("co");


co(function*() {
    var confExample = {
        port: false,//{Number} port IMAP server port to connect to, false to use default
        host: 'imap.gmail.com',//{String} host IMAP server hostname
        option: { //detail https://github.com/andris9/inbox#create-new-imap-connection
            secureConnection: true,
            auth: {
                user: 'asdfas',
                pass: 'asdf'
            },
            debug: true
        }
    };

    var surelia = Surelia(confExample.port, confExample.host, confExample.option);
    yield surelia.connect();
    var mailboxed = yield surelia.listMailboxes();
    var options = {
        path: "INBOX",
        readOnly: false,
        from: 0,
        limit: 10
    };
    var messages = yield surelia.listEmails(false,options);
    console.info(mailboxed);

    options = {
        path: "INBOX",
        readOnly: false,
        iud: messages[0].UID
    };

    var letter = yield surelia.readEmail(false,options);
    console.info(letter);

})(function(){
    console.info(arguments);
    process.exit(0);
});