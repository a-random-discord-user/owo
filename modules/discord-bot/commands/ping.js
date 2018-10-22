const { captainEmbed } = require(`${process.cwd()}/modules/discord-bot/utils/MessageEmbed`);
exports.run = (client, message) => {
    const description = `Latency: ${Math.ceil(client.ping)}ms`;
    message.channel.send({ embed: captainEmbed(description)});
};