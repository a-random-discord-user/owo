const r = require('./database');
const client = require('./discord-bot');
const settings = require('../settings.json');

const configure = (req, res, next) => {
if (req.user) {
	r.table('users').get(req.user.id).run(async (error, userInfo) => {
    if (userInfo.isAdmin == true) req.user.admin = true
    if (userInfo.isMod == true) req.user.mod = true
    res.locals.user = req.user;
	next()
});
} else {
	res.locals.user = req.user;
	next();
}
}

const auth = (req, res, next) => {
    if (req.user) {
        next()
    } else {
        res.redirect('/auth')
    }
}

const mod = (req, res, next) => {
	if (req.user && req.user.mod || req.user.admin) {
		next();
	} else {
		res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not a Website Moderator.' });
	}
};

const admin = (req, res, next) => {
	if (req.user && req.user.admin) {
		next();
	} else {
		res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not a Website Admin.' });
	}
};

const inServer = (req, res, next) => {

    if (req.user) {
        if (!client.guilds.get(settings.guildID).members.find(u => u.id == req.user.id)) {
            res.status(400).render('error', { title: 'Error', status: 400, message: 'You must be in our Discord guild to add a bot.' }); 
        } else {
            next()
        }
    } else {
        res.redirect('/auth')
    }
}


module.exports = {
    configure, auth, mod, admin, inServer
}