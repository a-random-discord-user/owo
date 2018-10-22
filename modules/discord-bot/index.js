const Discord = require("discord.js");
const Enmap = require("enmap");
const fs = require("fs");
const path = require("path");
const client = new Discord.Client();
const config = require("../../settings.json");
client.config = config;
client.commands = new Enmap();
const r = require('../database');

// load events here
fs.readdir(`${process.cwd()}/modules/discord-bot/events/`, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => {
        if (!file.endsWith(".js")) return;
        const event = require(`./events/${file}`);
        let eventName = file.split(".")[0];

        client.on(eventName, event.bind(null, client));
        delete require.cache[require.resolve(`./events/${file}`)];
    })
});

// load commands here
fs.readdir(`${process.cwd()}/modules/discord-bot/commands`, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => {
        if(!file.endsWith(".js")) return;
        let props = require(`./commands/${file}`);
        let commandName = file.split(".")[0];
        
        client.commands.set(commandName, props);
    })
});

// Logging in

client.login(config.token);
module.exports = client;