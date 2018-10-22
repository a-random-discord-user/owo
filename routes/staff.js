const express = require('express');
const router = express.Router();
const r = require('../modules/database');
const user = require('../modules/user');
const chunk = require('chunk');

router.get('/queue', user.configure, user.auth, user.mod, (req, res, next) => {
	r.table('bots').filter({ approved: false }).merge(bot => ({
		ownerinfo: bot('owners')
			.default([])
			.append(bot('owner'))
			.map(id => r.table('users').get(id))
			.default({ username: 'Unknown', tag: 'Unknown#0000' })
	})).run(async (error, bots) => {
		const botChunk = chunk(bots, 3);
		res.render('staff/bots', { title: 'Bot Queue', botsData: bots, botChunk })
	})
});

router.get('/admin/users', user.configure, user.auth, user.admin, (req, res, next) => {
	r.table('users').run(async (error, users) => {
		const userChunk = chunk(users, 3);
		res.render('staff/users', { title: 'User Manager', usersData: users, userChunk })
	})
});


router.get('/admin/verification', user.configure, user.auth, user.admin, (req, res, next) => {
	r.table('verification_apps')
	.merge(info => ({
		botinfo: r.table('bots').get(info('id')),
		ownerInfo: r.table('users').get(info('user'))
	})) 
	.run(async (error, apps) => {
		res.render('staff/apps', { title: 'Verification', apps })
	})
});

router.get('/admin/rank/:id/:rank', user.configure, user.auth, user.admin, async (req, res, next) => {
	const user = await r.table('users').get(req.params.id).run();
	let rank = req.params.rank;
	if (!user) return res.status(404).render('error', { title: 'Error', status: 404, message: 'User does not exist.' });

	if (rank == 'User') {
		r.table('users').get(req.params.id).update({ isMod: false, isAdmin: false }).run();
		res.status(200).render('error', { title: 'Success', status: 200, message: 'Assigned ' + user.tag + ' User.' });
	} else if (rank == 'Verified Dev') {
		if (user.isVerifiedDev == true) {
			r.table('users').get(req.params.id).update({ isVerifiedDev: false }).run()
			res.status(200).render('error', { title: 'Success', status: 200, message: 'Unassigned ' + user.tag + ' Verified Developer.' });
		} else {
			r.table('users').get(req.params.id).update({ isVerifiedDev: true }).run()
			res.status(200).render('error', { title: 'Success', status: 200, message: 'Assigned ' + user.tag + ' Verified Developer.' });
		}
	} else if (rank == 'Mod') {
		r.table('users').get(req.params.id).update({ isMod: true }).run()
		res.status(200).render('error', { title: 'Success', status: 200, message: 'Assigned ' + user.tag + ' Moderator.' });
	} else if (rank == 'Admin') {
		r.table('users').get(req.params.id).update({ isMod: true, isAdmin: true }).run()
		res.status(200).render('error', { title: 'Success', status: 200, message: 'Assigned ' + user.tag + ' Admin.' });
	} else {
		res.status(400).render('error', { title: 'Error', status: 400, message: 'Invalid rank.' });
	}
})

router.get('/admin/:id/:delete', user.configure, user.auth, user.admin, async (req, res, next) => {
	const user = await r.table('users').get(req.params.id).run();
	if (user.isMod == true || user.isAdmin == true) return res.status(400).render('error', { title: 'Success', status: 400, message: 'That user is a moderator / admin. Please unassign their rank and try again.' });
	if (!user) return res.status(404).render('error', { title: 'Error', status: 404, message: 'User does not exist.', user });
	res.render('staff/delete', { title: 'Delete User', user })
})

router.post('/admin/:id/:delete', user.configure, user.auth, user.admin, async (req, res, next) => {
	const user = await r.table('users').get(req.params.id).run();
	if (!user) return res.status(404).render('error', { title: 'Error', status: 404, message: 'User does not exist.', user });
	if (user.isMod == true || user.isAdmin == true) return res.status(400).render('error', { title: 'Success', status: 400, message: 'That user is a moderator / admin. Please unassign their rank and try again.' });
	r.table('users').get(req.params.id).delete().run()
	res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully deleted account.' });
})
module.exports = router;