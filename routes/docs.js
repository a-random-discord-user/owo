const express = require('express');
const router = express.Router();
const user = require('../modules/user');

router.get('/', user.configure, (req, res, next) => {
	res.render('docs/index', { title: 'Docs' })
});

router.get('/license', user.configure, (req, res, next) => {
	res.render('docs/license', { title: 'Website License' })
});

router.get('/api', user.configure, (req, res, next) => {
	res.render('docs/api', { title: 'API' })
});

router.get('/verification', user.configure, (req, res) => {
	res.render('docs/verification', { title: 'Verification Requirements' })
})

router.get('/privacypolicy', user.configure, (req, res) => {
	res.render('docs/policy', { title: 'Privacy Policy' })
})

module.exports = router;
