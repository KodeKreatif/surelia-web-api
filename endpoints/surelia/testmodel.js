var Surelia = require("./model");
var co = require("co");


co(function*() {
    var confExample = {
        port: false,//{Number} port IMAP server port to connect to, false to use default
        host: 'imap.gmail.com',//{String} host IMAP server hostname
        mailerProtokol:'smtp',
        option: { //detail https://github.com/andris9/inbox#create-new-imap-connection
            secureConnection: true,
            service:"Gmail",
            auth: {
                user: 'medh4.andro@gmail.com',
                pass: 'masjasoet'
            },
            debug: true
        }
    };

    var surelia = Surelia(confExample.port, confExample.host, confExample.option);
    yield surelia.connect();
    var messages = yield surelia.listEmails(false, "INBOX", true, -1, 1);

    var letter = yield surelia.readEmail(false, "INBOX", true, messages[0].UID);
    console.info(letter);

})(function () {
    console.info(arguments);
    process.exit(0);
});