const express = require('express');
const router = express.Router();
const r = require('../modules/database');
const user = require('../modules/user');
const chunk = require('chunk');

/* GET home page. */
router.get('/:id', user.configure, async (req, res, next) => {
    const getUser = await r.table('users').get(req.params.id).run();
    if (!getUser) return res.status(404).render('error', { title: 'Error', status: 404, message: 'User not found.'})
    r.table('bots')
    .merge(bot => ({
		ownerinfo: bot('owners')
			.default([])
			.append(bot('owner'))
			.map(id => r.table('users').get(id))
			.default({ username: 'Unknown', tag: 'Unknown#0000' })
    }))
    .run(async (error, bots) => {
    r.table('bots_backup')
    .merge(bot => ({
		ownerinfo: bot('owners')
			.default([])
			.append(bot('owner'))
			.map(id => r.table('users').get(id))
			.default({ username: 'Unknown', tag: 'Unknown#0000' })
    }))
    .filter({ owner: req.params.id }).run(async (error, bots_backup) => {
        bots = bots.filter(bot => (req.params.id == bot.owner) || bot.owners.includes(req.params.id));
        const botChunk = chunk(bots, 3);
        const storedChunk = chunk(bots_backup, 3);
		res.render('profile', { title: getUser.tag, botsData: bots, botChunk, userInfo: getUser, storedBotsData: bots_backup, storedChunk })
    })
})
});

module.exports = router;