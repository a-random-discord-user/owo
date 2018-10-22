const express = require('express');
const router = express.Router();
const r = require('../modules/database');

/* GET api page. */
router.get('/', (req, res, next) => {
  res.redirect('/docs');
});

router.get('/bot/:id', async (req, res) => {
  r.table('bots').get(req.params.id).without('token').run(async (error, bot) => {
    if (!bot) return res.status(404).json({ message: 'Bot not found.' });
    res.status(200).json(bot)
  })
});

router.post('/bot/:id', async (req, res) => {
  const bot = await r.table('bots').get(req.params.id).run();
  const header = req.headers['authorization'];
  const amount = req.body.count || req.body.server_count || req.body.guild_count;
  if (!header || header == '') return res.status(400).json({ message: 'Authorization is required.' });
  if (!amount || amount == '') return res.status(400).json({ message: 'Server count is required.' });
  if (isNaN(amount)) return res.status(400).json({ message: 'Server count must be a valid number.' });
  if (!bot) return res.status(400).json({ message: 'Invalid bot.' });
  if (bot.token != header) return res.status(400).json({ message: 'Invalid authorization token.' });
  r.table('bots').get(req.params.id).update({ server_count: Number(amount) }).run()
  res.status(200).json({ message: 'Server count successfully updated.' })
});

router.get('/bots/:id', async (req, res) => {
  const user = await r.table('users').get(req.params.id).run();
  if (!user) return res.status(200).json({ message: 'User not found.' });
  let bots = await r.table('bots').run();
  bots = bots.filter(bot => (req.params.id == bot.owner) || bot.owners.includes(req.params.id));
  if (bots.length == 0) return res.status(200).json({ bots: 'User has no bots.' })
  res.status(200).json({ bots: Array.from(bots.map((bot) => bot.id)) })
});

router.get('/user/:id', async (req, res) => {
  r.table('users').get(req.params.id).run(async (error, user) => {
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json(user)
  })
})
  .use('*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found.' });
  });

module.exports = router;
