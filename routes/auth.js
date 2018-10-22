const express = require('express');
const router = express.Router();
const passport = require('passport');
const session  = require('cookie-session');
const Strategy = require('passport-discord').Strategy
const settings = require('../settings.json');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const r = require('../modules/database');

passport.use(new Strategy({
    clientID: settings.clientID,
    clientSecret: settings.clientSecret,
    callbackURL: settings.callbackURL,
    scope: ['identify']
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));

router.get('/', passport.authenticate('discord'));

router.get('/login', (req, res, next) => {
    res.redirect('/auth/');
});

router.get('/info', (req, res, next) => {
    res.json(req.user)
});

router.get('/callback', passport.authenticate('discord', {
}), (req, res, next) => { 
    r.table('users').get(req.user.id).run(async (error, user) => {
        if (!user) {
            r.table('users').insert({
                id: req.user.id,
                username: req.user.username,
                tag: req.user.username + "#" + req.user.discriminator,
                avatar: req.user.avatar,
                isMod: false,
                isAdmin: false,
                isVerifiedDev: false
            }).run()
        } else {
            r.table('users').get(req.user.id).update({
                username: req.user.username,
                tag: req.user.username + "#" + req.user.discriminator,
                avatar: req.user.avatar
            }).run()
        }
        await res.redirect('/')
    })
})

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})



module.exports = router;
