const snekfetch = require('snekfetch');
const util = require('util');

exports.run = async function(client, message, args, r) {
    if (message.author.id == '310081310335172608') {
    if (!args.join(' ')) return message.channel.send("\:x: Invalid Arguments.")
    try {
        let result = await eval(args.join(' '));
        if (typeof result !== 'string') result = util.inspect(result);
        result = result;
        if (result.length > 1023) {
            console.log(result);
            result = 'Logged to console'
        } else {
            message.channel.send({embed: {
                color: 3447003,
                fields: [{
                    name: "\:inbox_tray: INPUT",
                    value: "```js\n" + args.join(' ') + "\n```"
                },
                {
                    name: "\:outbox_tray: OUTPUT",
                    value: "```js\n" + result + "\n```"
                }
                ]
            }
            })
        }
    } catch (e) {
        message.channel.send({embed: {
            color: 3447003,
            fields: [{
                name: "\:inbox_tray: INPUT",
                value: "```js\n" + args.join(' ') + "\n```"
            },
            {
                name: "\:outbox_tray: OUTPUT",
                value: "```js\n" + e + "\n```"
            }
            ]
        }
        })
    }
}

};