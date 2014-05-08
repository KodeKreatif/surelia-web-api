var request = require("supertest").agent;
var Surelia = require("./model");
var co = require("co");


co(function*() {
    var confExample = {
        port: false,//{Number} port IMAP server port to connect to, false to use default
        host: 'imap.gmail.com',//{String} host IMAP server hostname
        mailerProtokol: 'smtp',
        option: { //detail https://github.com/andris9/inbox#create-new-imap-connection
            secureConnection: true,
            service: "Gmail",
            auth: {
                user: 'medh4.andro@gmail.com',
                pass: 'masjasoet'
            },
            debug: false
        }
    };

    var surelia = Surelia(confExample.port, confExample.host, confExample.option);
    yield surelia.connect();

    var mailboxes = yield surelia.listMailboxes();
    console.info(mailboxes);
    console.info("======================================================================================================================");
    var options = {
        path: "INBOX",
        readOnly: true,
        from: -1,
        limit: 1
    };

    var messages = yield surelia.listEmails(false, options);
    console.info(messages);
    console.info("======================================================================================================================");
    options = {
        path: "INBOX",
        readOnly: true,
        uid: messages.data[0].UID
    };


    var letter = yield surelia.readEmail(false, options);
    console.info(letter);
    console.info("======================================================================================================================");

    var letterRaw = yield surelia.readEmailRaw(false, options);
    console.info(letterRaw);
    console.info("======================================================================================================================");

    options = {
        protocol: "smtp",
        transportOption: {
            service: "Gmail",
            auth: {
                user: 'medh4.andro@gmail.com',
                pass: 'masjasoet'
            }
        },
        mailOptions: {
            from: "Surelia <surelia@kodekreatif.github.com>", // sender address
            to: "jasoet87@gmail.com,medha4.andro@gmail.com,mdamt@mdamt.net", // list of receivers
            subject: "Hello From Surelia ✔", // Subject line
            text: "Hello Surelia ✔", // plaintext body
            html: "<b>Hello world From Surelia ✔</b>", // html body
            attachments: [
                {   // use URL as an attachment
                    fileName: "license.txt",
                    filePath: "https://raw.github.com/andris9/Nodemailer/master/LICENSE"
                }
            ]
        }
    };

    var mailSent = yield surelia.sendEmail(false, options);
    console.info(mailSent);
    console.info("======================================================================================================================");

})(function () {
    console.info(arguments);
    process.exit(0);
});