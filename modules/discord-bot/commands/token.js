const { captainEmbed } = require(`${process.cwd()}/modules/discord-bot/utils/MessageEmbed`);
const r = require(`${process.cwd()}/modules/database`);

async function grabToken(message, id) {
    if(!id) return message.channel.send("Please provide a bot id.");
    var owner = await r.table('bots').get(id).getField("owner").run().catch(err => {
        message.channel.send("The ID couldn't be found in our database, therefore no token is generated!");
    });
    if(message.author.id !== owner) return message.channel.send("Unauthorized access.");
    var token = await r.table('bots').get(id).getField("token").run();
    var botName = await r.table('bots').get(id).getField("name").run();
    let description = `This is **${botName}**'s API token\n\`\`\`${token}\`\`\``;
    return message.author.send({ embed: captainEmbed(description)});
};

exports.run = (client, message, params) => {
    grabToken(message, params[0]);
};