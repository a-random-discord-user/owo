
module.exports = client => {
    console.log(`Connected to ${client.guilds.size} guilds`)
    client.user.setPresence({ game: { name: `Bots for Discord`, type: 3 } });  
};
  