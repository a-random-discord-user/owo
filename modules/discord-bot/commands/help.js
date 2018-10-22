const discord = require("discord.js");
exports.run = function(client, message, params) {
  var description;
  if (message.author.hasPermission("KICK_MEMBERS")) {
    description = "**Moderation Commands**\n`ban` -> Bans the specified user. \n`kick` -> Kicks the specifice user. \n`reason` -> Change the reason of an existing case. \n`case` -> Displays information of an existing case.\n`mute` -> Mutes the specificed user. \n`unmute` -> Unmutes the specificed user. \n**General Commands**: \n`ping` -> pong!";
  } else {
    description = "**General Commands**: \n`ping` -> pong!"
  };
  message.channel.send({ embed: captainEmbed(description)});
};