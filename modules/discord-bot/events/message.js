const r = require('../../database');
module.exports = (client, message) => {
    // ignore bots and dm commands
    if (message.author.bot || !message.guild) return;
    // make sure message starts with prefix
    if (message.content.indexOf(client.config.prefix) !== 0) return;

    // slice off prefix & command, we're left with parameters.
    const params = message.content.slice(client.config.prefix.length).trim().split(/ +/g);
    // slices off the params, lowercases the command name. we're left with command name
    const command = params.shift().toLowerCase();

    // grab the command file from the enmap with command name.
    const cmd = client.commands.get(command);
    // exits event if command is not defined.
    if (!cmd) return;

    // runs the file and passes the client, message and params to the file.
    cmd.run(client, message, params, r);
};