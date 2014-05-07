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
//    var mailboxed = yield surelia.listMailboxes();
//    console.info(mailboxed);
    var messages = yield surelia.listEmails(false, "INBOX", true, 0, 10);
//    console.info(messages);


    var letter = yield surelia.readHeaders(false, "INBOX", true, messages[0].UID);
    console.info(letter.flags);

    var flags = yield surelia.markUnread(false, "INBOX", true, messages[0].UID);
    console.info(flags);

      flags = yield surelia.markRead(false, "INBOX", true, messages[0].UID);
    console.info(flags);

    letter = yield surelia.readHeaders(false, "INBOX", true, messages[0].UID);
    console.info(letter.flags);

})(function () {
    console.info(arguments);
    process.exit(0);
});