const express = require('express');
const router = express.Router();
const r = require('../modules/database');
const user = require('../modules/user');
const chunk = require('chunk');
const client = require('../modules/discord-bot/index')


/* GET home page. */
router.get('/', user.configure, async (req, res, next) => {
	const bots = await r.table('bots').filter({ approved: true })
		.merge(bot => ({ 
			random: r.random(1, 100 )
		}))
		.merge(bot => ({
			ownerinfo: bot('owners')
				.default([])
				.append(bot('owner'))
				.map(id => r.table('users').get(id))
				.default({ username: 'Unknown', tag: 'Unknown#0000' })
		}))
		.orderBy('random').run()
		const botChunk = chunk(bots, 3);
		res.render('index', { title: 'Home', botsData: bots, botChunk})
});

module.exports = router;