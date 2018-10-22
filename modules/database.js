const settings = require(`../settings.json`);
const r = require('rethinkdbdash')(settings.rethink);

/*
// USER FUNCTIONS 
async function getAllUsers() {
    if(!r.tableList().contains("users")) return console.log("Table users in bfd does not exist.");
    return await r.table('users').run();
};

async function getUser(userID) {
    if(!r.tableList().contains("users")) return console.log("Table users in bfd does not exist.");
    return await r.table('users').get(userID).run();
};

// BOT FUNCTIONS 
async function getAllBots() {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist");
    return await r.table('bots').filter(r.row('approved').eq(true)).run();
};

async function getBot(botID) {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist.");
    return await r.table('bots').get(botID).run();
};

async function getAllVerifiedBots() {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist");
    return await r.table('bots').filter(r.row('verified').eq(true)).run();

};

async function getAllAwaitingApprovalBots() {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist");
	return await r.table('bots').filter(r.row('approved').eq(false)).run();
};

async function getAllAwaitingVerificationBots() {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist");
    return await r.table('bots').filter(r.row('verified').eq(false)).run();
};

async function getAllBotsByUser(userID) {
	if (!r.tableList().contains("bots")) return console.log("Table `bots` in `bfd` does not exist");
	return await r.table('bots').filter(r.row('user').eq(userID)).run();
};
*/


module.exports = r

