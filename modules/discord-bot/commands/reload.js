exports.run = (client, message, params) => {
  if(!params || params.size < 1) return message.reply("Must provide a command name to reload.");
  const commandName = params[0];

  if(!client.commands.has(commandName)) {
    return message.reply("That command does not exist");
  }
  delete require.cache[require.resolve(`./${commandName}.js`)];

  client.commands.delete(commandName);
  const props = require(`./${commandName}.js`);
  client.commands.set(commandName, props);
  message.channel.send(`${commandName} has now been reloaded`);
};
