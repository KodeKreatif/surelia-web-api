var Surelia = require("./model");
var co = require("co");


co(function*() {
    var confExample = {
        port: false,//{Number} port IMAP server port to connect to, false to use default
        host: 'imap.gmail.com',//{String} host IMAP server hostname
        option: { //detail https://github.com/andris9/inbox#create-new-imap-connection
            secureConnection: true,
            auth: {
                user: 'jasoet87@gmail.com',
                pass: 'asdf'
            },
            debug: true
        }
    };

    var surelia = Surelia(confExample.port, confExample.host, confExample.option);
    yield surelia.connect();
    var mailboxed = yield surelia.listMailboxes();
    console.info(mailboxed);
    var messages = yield surelia.listEmails(false, "INBOX",false, 0, 10);
    console.info(messages);

    options = {
        path: "INBOX",
        readOnly: false,
        iud: 1
    };

    var letter = yield surelia.readEmailRaw(false, "INBOX",false,messages[0].UID);
    console.info(letter);

})(function () {
    console.info(arguments);
    process.exit(0);
});