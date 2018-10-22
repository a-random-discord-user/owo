const Discord = require('discord.js');
exports.run = (client, message, params) => {
    if (!message.channel.permissionsFor(message.author).hasPermission("KICK_MEMBERS")) return message.channel.send ("📛 Whoops! Looks like you don't have permissions to execute this command. 📛");
    if (!message.channel.permissionsFor(client.user).hasPermission("KICK_MEMBERS")) return message.channel.send ("📛 Looks like I don't have permissions. 📛");
    
    let kickChannel = message.guild.channels.find('name', 'mod-log');
    if (!kickChannel) return message.channel.send("Unforuntately, I could not find the `mod-log` channel. Please create one or allow me access to the channel.");
    let kUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(params[0]));
    if(!kUser) return message.channel.send("The user you provided was invalid.")

    let kReason = params.join(" ").slice(31);
    let kickEmbed;

    if (!kReason) {
        kickEmbed = new Discord.RichEmbed()
            .setDescription("~ Kick ~")
            .setColor("#689AFB")
            .addField("User Kicked", `${kUser.username}`, false)
            .addField("Moderator", `${message.author.tag}`, false )
            .addField("In Channel", `<#${message.channel.id}>`, false)
            .addField ("Reason","No reason specified" , false)
            .setTimestamp();
    } else {
        kickEmbed = new Discord.RichEmbed()
            .setDescription("~ Kick ~")
            .setColor("#689AFB")
            .addField("User kicked", `${kUser.username}`, false)
            .addField("Moderator Responsibe", `${message.author.tag}`, false )
            .addField("In Channel", `<#${message.channel.id}>`, false)
            .addField("Reason", kReason, false);
    };
    kickChannel.send(kickEmbed);
    kUser.kick();
    message.channel.send("Successfully kicked the person! :)")
};
