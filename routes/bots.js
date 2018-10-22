const express = require('express');
const router = express.Router();
const r = require(`../modules/database.js`);
const user = require('../modules/user');
const request = require('request'); 
const settings = require('../settings.json');
const client = require('../modules/discord-bot');
const crypto = require('crypto');
const reasons = require('../modules/data/reasons.json');
const marked = require('marked');
const cheerio = require('cheerio');

const perm = (level) =>
	async (req, res, next) => {
		const getBot = await r.table('bots').get(req.params.id || req.body.id).run();

		if (!getBot) {
			res.status(404).render('error', { title: 'Error', status: 404, message: 'Bot not found.' });
		} else if ((level <= 3 && req.user.admin) || (level <= 2 && req.user.admin || req.user.mod) || (level <= 1 && getBot.owners.includes(req.user.id) || getBot.owner == req.user.id)) {
			next();
		} else {
			res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not allowed to edit other\'s bots' });
		}
};

const clean = (html) => {
  const $ = cheerio.load(html);
  $('*').each((i, element) => {
      Object.keys(element.attribs)
          .filter(attribute => attribute.startsWith('on'))
          .forEach((attribute) => {
              $(element).removeAttr(attribute);
          });
  });
  $('script').remove();
  $('object').remove();
  return $.html();
};

router.get('/add', user.configure, user.auth, user.inServer, (req, res, next) => {
  res.render('bots/add', { title: 'Add Bot' })
});

router.post('/add', user.configure, user.auth, user.inServer, async (req, res, next) => {
  let checkBot = await r.table('bots').get(req.body.client_id);
  if (checkBot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot has already been added to the list.' })
  let invite;
  if (req.body.invite == '') {
    invite = `https://discordapp.com/oauth2/authorize?client_id=${req.body.client_id}&scope=bot`
  } else {
    if (typeof req.body.invite !== 'string') {
			res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invalid invite.' })
		} else if (req.body.invite.length > 2000) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invite that was too long (2000)' })
		} else if (!/^https?:\/\//.test(req.body.invite)) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'Your invite must use HTTP or HTTPS' });
  } else if (!req.body.invite.startsWith('https://discordapp.com/') ){
    return res.status(400).render('error', { title: 'Error', status: 400, message: 'Invalid invite URL. It must start with: https://discordapp.com/.' });
  } else {
    invite = req.body.invite
  }
  }
  request({
      uri: `https://discordapp.com/api/users/${req.body.client_id}`,
      method: 'GET',
      headers: {
          'User-Agent': settings.useragent,
          Authorization: `Bot ${settings.token}`
      },
      json: true
  }, (err, response, discordResponse) => {
  if (req.body.client_id.length > 32) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'The bot id must not be greater than 32 numbers.' })
  } else if (req.body.owners.length > 200) {
    return res.status(400).render('error', { title: 'Error', status: 400, message: 'You can\'t have more than 5 owners.'}) 
  } else if (discordResponse.message == 'Unknown User') {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot does not exist on Discord.'}) 
  } else if (!discordResponse.bot) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'You cannot add users to the list.'})
  } else if (discordResponse.bot == true){ 
    let owners;
    if (req.body.owners == '') {
      owners = []
    } else {
      owners = [...new Set(req.body.owners.split(/\D+/g))]
    }
      r.table('bots').insert({ 
          id: req.body.client_id,
          name: discordResponse.username,
          avatar: discordResponse.avatar,
          prefix: req.body.prefix,
          library: req.body.library,
          invite: invite,
          short_desc: req.body.short_desc,
          long_desc: req.body.long_desc,
          support_server: req.body.support,
          github: req.body.github,
          website: req.body.website,
          mod_notes: req.body.notes,
          owner: req.user.id,
          owners: owners,
          approved: false,
          verified: false,
          server_count: 0,
          token: crypto.randomBytes(64).toString('hex')
      }).run()
      r.table('bots_backup').get(req.body.client_id).delete().run()
      client.users.get(req.user.id).send("\:inbox_tray: Your bot \`" + discordResponse.username + "\` <@" + req.body.client_id + "> has been added to the queue. Please be patient while a Website Moderator approves it.")
      .catch(e => console.log("Failed to DM user."));
    client.channels.get(settings.channels.weblog).send("\:inbox_tray: <@" + req.user.id + "> added \`" + discordResponse.username + "\` <@" + req.body.client_id + "> (\:eyes: <@&" + settings.roles.staff + ">)\n<https://botsfordiscord.com/bots/" + req.body.client_id + ">")
    res.status(200).render('error', { title: 'Success', status: 200, message: 'Thanks for adding your bot! It will be looked at soon.'}) 
  } else {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot does not exist on Discord.'}) 
  }
  })
});

router.get('/verification', user.configure, user.auth, user.inServer, async (req, res, next) => {
  const bots = await r.table('bots').filter({ owner: req.user.id }).run()
  res.render('bots/verification', { title: 'Verification', bots })
});

router.post('/verification', user.configure, user.auth, user.inServer, async (req, res, next) => {
  const checkBot = await r.table('bots').get(req.body.bot).run();
  const checkApp = await r.table('verification_apps').get(req.body.bot).run();
  if (!checkBot || checkBot.owner != req.user.id) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You don\'t own that bot. '});
  if (checkApp) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You have already applied this bot for verification.'});

  try {
    await client.users.get(req.user.id).send("<:" + settings.emojis.verified + "> Thanks for applying for verification! I will keep you updated.")
  } catch(e) {
    console.log("Failed to DM user.")
  }
  r.table('verification_apps').insert({
    id: req.body.bot,
    user: req.user.id,
    server_count: req.body.server_count,
    online: req.body.online,
    original_code: req.body.original_code,
    features: req.body.features,
    website: req.body.website
  }).run()
  client.channels.get(settings.channels.verification_log).send({
    embed: {
      color: 7506394,
      fields: [
        {
          name: "Bot / Owner",
          value: "<@" + req.body.bot + "> / <@" + req.user.id + ">"
        },
        {
          name: "Does your bot post server count to our API?",
          value: req.body.server_count
        },
        {
          name: "Is your bot online 24/7 other than short maintenance?",
          value: req.body.online
        },
        {
          name: "Is your bot original code and not a fork of another bot?",
          value: req.body.original_code
        },
        {
          name: "What is your bot's main feature?",
          value: req.body.features
        },
        {
          name: "Website or Github where the widget is located.",
          value: "[" + req.body.website + "](" + req.body.website + ")"
        }
      ],
    }
  }).then(m => { 
    m.react('✅')
    m.react('❌')
  })
  client.channels.get(settings.channels.weblog).send("<:" + settings.emojis.verified + "> <@" + req.user.id + "> applied \`" + checkBot.name + "\` <@" + req.body.bot + "> for verification. (\:eyes: <@&" + settings.roles.admins + ">)\n<https://botsfordiscord.com/bots/" + req.body.bot + ">");
  res.status(200).render('error', { title: 'Success', status: 200, message: 'Thanks for applying for verification! We will get back to you soon.'});
});

router.get('/:id/delete', user.configure, user.auth, perm(1), (req, res, next) => {
    res.render('bots/delete', { title: 'Delete Bot' })
});

router.post('/:id/delete', user.configure, user.auth, perm(1), (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    r.table('bots_backup').insert({
      id: bot.id,
      name: bot.username,
      avatar: bot.avatar,
      prefix: bot.prefix,
      library: bot.library,
      invite: bot.invite,
      short_desc: bot.short_desc,
      long_desc: bot.long_desc,
      support_server: bot.support,
      github: bot.github,
      website: bot.website,
      owner: bot.owner,
      owners: bot.owners,
      server_count: bot.server_count,
      token: bot.token,
      mod_notes: req.body.notes,
      remove_time: Date.now() + 1209600000
    }).run();

    let owners = bot.owners;
    owners.unshift(bot.owner);
    let botDevs = owners.map((dev) => {
      return '<@' + dev + '>'
      }).join(', ');
      if (client.guilds.get(settings.guildID).members.find(u => u.id == bot.id)) {
        try {
          await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).kick('Bot deleted by ' + req.user.username + ' (' + req.user.id + ')')
        } catch(e) {
          console.log("Failed to kick bot.")
        }
      }
      r.table('bots').get(req.params.id).delete().run()
      client.channels.get(settings.channels.weblog).send("\:wastebasket: <@" + req.user.id + "> deleted \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs)
      res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully deleted bot.'});
    
    })
})

router.get('/:id/token', user.configure, user.auth, perm(1), (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    res.render('bots/token', { title: 'Bot Token', bot })
  })
});

router.get('/:id/edit', user.configure, user.auth, perm(1), (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    res.render('bots/edit', { title: 'Edit Bot', owners: bot.owners ? bot.owners.join(' ') : '', bot })
  })
});

router.post('/:id/edit', user.configure, user.auth, perm(1), async (req, res, next) => {
  if (req.body.owners.length > 200) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You can\'t have more than 5 owners.'})
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (typeof req.body.invite !== 'string') {
			res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invalid invite.' })
		} else if (req.body.invite.length > 2000) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invite that was too long (2000)' })
		} else if (!/^https?:\/\//.test(req.body.invite)) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'Your invite must use HTTP or HTTPS' });
  } else if (!req.body.invite.startsWith('https://discordapp.com/') ){
    return res.status(400).render('error', { title: 'Error', status: 400, message: 'Invalid invite URL. It must start with: https://discordapp.com/.' });
  }
  
  let owners;
  if (req.body.owners == '') {
    owners = []
  } else {
    owners = [...new Set(req.body.owners.split(/\D+/g))]
  }
  request({
    uri: `https://discordapp.com/api/users/${req.params.id}`,
    method: 'GET',
    headers: {
        'User-Agent': settings.useragent,
        Authorization: `Bot ${settings.token}`
    },
    json: true
}, (err, response, discordResponse) => {
    r.table('bots').get(req.params.id).update({ 
      name: discordResponse.username,
      avatar: discordResponse.avatar,
      prefix: req.body.prefix,
      library: req.body.library,
      invite: req.body.invite,
      short_desc: req.body.short_desc,
      long_desc: req.body.long_desc,
      support_server: req.body.support,
      github: req.body.github,
      mod_notes: req.body.notes,
      website: req.body.website,
      owners: owners
  }).run(async (error, update) => {
  if (update.unchanged) {
    res.status(400).render('error', { title: 'Error', status: 400, message: 'Nothing to update.'});
  } else {
    let owners = bot.owners;
    owners.unshift(bot.owner);
    let botDevs = owners.map((dev) => {
      let userTag = client.users.get(dev);
      if (!userTag) return 'Invalid-User#0000'
      return userTag.tag
      }).join(', ')
    client.channels.get(settings.channels.weblog).send("\:pencil: " + req.user.username + "#" + req.user.discriminator + " (" + req.user.id + ") edited \`" + discordResponse.username + "\` <@" + req.params.id + "> by " + botDevs + "\n<https://botsfordiscord.com/bots/" + req.params.id + ">")
    res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully updated bot.'});
  }
}) }) }) 
});

router.get('/resubmit/:id', user.configure, user.auth, user.inServer, (req, res, next) => {
  r.table('bots_backup').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot cannot be found.'});
    if (bot.owner != req.user.id) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not the owner of that bot.' }); 
    res.render('bots/resubmit', { title: 'Resubmit Bot', bot, owners: bot.owners ? bot.owners.join(' ') : '' })
  })
});

router.get('/resubmit/:id/delete', user.configure, user.auth, (req, res, next) => {
  r.table('bots_backup').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot cannot be found.'});
    if (bot.owner != req.user.id) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not the owner of that bot.' }); 
    r.table('bots_backup').get(req.params.id).delete().run()
    res.status(400).render('error', { title: 'Success', status: 200, message: 'Successfully removed bot data.' })
  })
});


router.post('/resubmit/:id', user.configure, user.auth, user.inServer, async (req, res, next) => {
  r.table('bots_backup').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot cannot be found.'});
    if (bot.owner != req.user.id) return res.status(400).render('error', { title: 'Error', status: 400, message: 'You are not the owner of that bot.' }); 
    let checkBot = await r.table('bots').get(req.params.id);
    if (checkBot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot has already been added to the list.' })
    let invite;
    if (req.body.invite == '') {
      invite = `https://discordapp.com/oauth2/authorize?client_id=${req.params.id}&scope=bot`
    } else {
      if (typeof req.body.invite !== 'string') {
        res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invalid invite.' })
      } else if (req.body.invite.length > 2000) {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'You provided an invite that was too long (2000)' })
      } else if (!/^https?:\/\//.test(req.body.invite)) {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'Your invite must use HTTP or HTTPS' });
    } else if (!req.body.invite.startsWith('https://discordapp.com/') ){
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'Invalid invite URL. It must start with: https://discordapp.com/.' });
    } else {
      invite = req.body.invite
    }
    }
    request({
        uri: `https://discordapp.com/api/users/${req.params.id}`,
        method: 'GET',
        headers: {
            'User-Agent': settings.useragent,
            Authorization: `Bot ${settings.token}`
        },
        json: true
    }, (err, response, discordResponse) => {
    if (req.params.id.length > 32) {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'The bot id must not be greater than 32 numbers.' })
    } else if (req.body.owners.length > 200) {
      return res.status(400).render('error', { title: 'Error', status: 400, message: 'You can\'t have more than 5 owners.'}) 
    } else if (discordResponse.message == 'Unknown User') {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot does not exist on Discord.'}) 
    } else if (!discordResponse.bot) {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'You cannot add users to the list.'})
    } else if (discordResponse.bot == true){ 
      let owners;
      if (req.body.owners == '') {
        owners = []
      } else {
        owners = [...new Set(req.body.owners.split(/\D+/g))]
      }
        r.table('bots').insert({ 
            id: req.params.id,
            name: discordResponse.username,
            avatar: discordResponse.avatar,
            prefix: req.body.prefix,
            library: req.body.library,
            invite: invite,
            short_desc: req.body.short_desc,
            long_desc: req.body.long_desc,
            support_server: req.body.support,
            github: req.body.github,
            website: req.body.website,
            mod_notes: req.body.notes,
            owner: req.user.id,
            owners: owners,
            approved: false,
            verified: false,
            server_count: bot.server_count,
            token: bot.token
        }).run()
        r.table('bots_backup').get(req.params.id).delete().run()
        client.users.get(req.user.id).send("\:inbox_tray: Your bot \`" + discordResponse.username + "\` <@" + req.params.id + "> has been re-added to the queue. Please be patient while a Website Moderator approves it.")
        .catch(e => console.log("Failed to DM user."));
      client.channels.get(settings.channels.weblog).send("\:inbox_tray: <@" + req.user.id + "> resubmitted \`" + discordResponse.username + "\` <@" + req.params.id + "> (\:eyes: <@&" + settings.roles.staff + ">)\n<https://botsfordiscord.com/bots/" + req.params.id + ">")
      res.status(200).render('error', { title: 'Success', status: 200, message: 'Thanks for re-adding your bot! It will be looked at soon.'}) 
    } else {
        return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot does not exist on Discord.'}) 
    }
    })
  })
});


router.get('/:id/approve', user.configure, user.auth, user.mod, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});
    if (bot.approved == true) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot has already been approved.'});
    let owners = bot.owners;
    owners.unshift(bot.owner);
    owners.map(async (dev) => {
      try {
        await client.guilds.get(settings.guildID).members.find(u => u.id == dev).roles.add(settings.roles.bot_developer)
      } catch(e) {
        console.log("Failed to add role to developers.")
      }
    })
    try {
      await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).roles.add(settings.roles.bot)
    } catch(e) {
      console.log("Failed to add bot role.")
    }
    let botDevs = owners.map((dev) => {
      return '<@' + dev + '>'
      }).join(', ');
    r.table('bots').get(req.params.id).update({ approved: true }).run()
    try {
      await client.users.get(bot.owner).send("\:white_check_mark: Your bot \`" + bot.name + "\` <@" + bot.id + "> has been approved by <@" + req.user.id + ">.")
    } catch(e) {
      console.log("Failed to alert bot dev.")
    }
    client.channels.get(settings.channels.weblog).send("\:white_check_mark: <@" + req.user.id + "> approved \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs + "\n<https://botsfordiscord.com/bots/" + bot.id + ">")
    if (client.guilds.get(settings.guildID).members.find(u => u.id == bot.id)) return res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully approved bot.'});
    res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully approved bot. Please add bot to main guild.'});
    
  })
});

router.get('/:id/verify', user.configure, user.auth, user.admin, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});
    if (bot.approved == false) return res.status(400).render('error', { title: 'Error', status: 400, message: 'That bot is now approved yet.'});
    if (bot.verified == true) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot has already been verified.'});
    let owners = bot.owners;
    owners.unshift(bot.owner);
    owners.map(async (dev) => {
      try {
        await client.guilds.get(settings.guildID).members.find(u => u.id == dev).roles.add(settings.roles.verified_developer)
      } catch(e) {
        console.log("Failed to add role to developers.")
      }
    })
    try {
      await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).roles.add(settings.roles.verified_bot)
    } catch(e) {
      console.log("Failed to add bot role.")
    }
    let botDevs = owners.map((dev) => {
      r.table('users').get(dev).run(async (error, user) => {
        if (user) {
          r.table('users').get(dev).update({ isVerifiedDev: true }).run();
        }
      })
      let userTag = client.users.get(dev);
      if (!userTag) return 'Invalid-User#0000'
      return userTag.tag;
      }).join(', ');
    r.table('bots').get(req.params.id).update({ verified: true }).run()
    r.table('verification_apps').get(req.params.id).delete().run()
    try {
      await client.users.get(bot.owner).send("<:" + settings.emojis.verified + "> Your bot \`" + bot.name + "\` <@" + bot.id + "> has been verified by <@" + req.user.id + ">! Enjoy your perks!")
    } catch(e) {
      console.log("Failed to alert bot dev.")
    }
    client.channels.get(settings.channels.weblog).send("<:" + settings.emojis.verified + "> <@" + req.user.id + "> verified \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs + "\n<https://botsfordiscord.com/bots/" + bot.id + ">")
    res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully verified bot.'});
  })
});

router.get('/:id/unverify', user.configure, user.auth, user.admin, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});
    if (bot.approved == false) return res.status(400).render('error', { title: 'Error', status: 400, message: 'That bot is now approved yet.'});
    if (bot.verified == false) return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot is not verified.'});
    res.render('staff/unverify', { title: 'Unverify', bot })
  })
});

router.post('/:id/unverify', user.configure, user.auth, user.admin, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});
    if (bot.approved == false) return res.status(400).render('error', { title: 'Error', status: 400, message: 'That bot is now approved yet.'});
    if (bot.verified == false) return res.status(400).render('error', { title: 'Error', status: 400, message: 'This bot is not verified.'});
    let owners = bot.owners;
    owners.unshift(bot.owner);
    try {
      await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).roles.remove(settings.roles.verified_bot)
    } catch(e) {
      console.log("Failed to remove bot role.")
    }
    let botDevs = owners.map((dev) => {
      let userTag = client.users.get(dev);
      if (!userTag) return 'Invalid-User#0000'
      return userTag.tag;
      }).join(', ');
    if (bot.verified == true) {
      try {
        await client.users.get(bot.owner).send("<:" + settings.emojis.verified + "> Your bot \`" + bot.name + "\` <@" + bot.id + "> has been unverified by <@" + req.user.id + ">.\n\:page_facing_up: Reason: \`" + req.body.reason + "\`")
      } catch(e) {
        console.log("Failed to alert bot dev.")
      }
      client.channels.get(settings.channels.weblog).send("<:" + settings.emojis.verified + "> <@" + req.user.id + "> unverified \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs + "\n<https://botsfordiscord.com/bots/" + bot.id + ">")
      client.channels.get(settings.channels.verification_log).send("**" + req.user.username + "#" + req.user.discriminator + "** unverified \`" + bot.name + "\` <@" + bot.id + "> with reason \`" + req.body.reason + "\`.");
      res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully unverified bot.'});
    } else {
      try {
        await client.users.get(bot.owner).send("<:" + settings.emojis.verified + "> Your bot \`" + bot.name + "\` <@" + bot.id + "> has been unverified by <@" + req.user.id + ">.\n\:page_facing_up: Reason: \`" + req.body.reason + "\`")
      } catch(e) {
        console.log("Failed to alert bot dev.")
      }
      client.channels.get(settings.channels.weblog).send("<:" + settings.emojis.verified + "> <@" + req.user.id + "> denied the verification for \`" + bot.name + "\` <@" + bot.id + ">");
      client.channels.get(settings.channels.verification_log).send("**" + req.user.username + "#" + req.user.discriminator + "** denied the verification \`" + bot.name + "\` <@" + bot.id + "> with reason \`" + req.body.reason + "\`.");

      res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully denied verification.'});
    }
    r.table('bots').get(req.params.id).update({ verified: false }).run()
    r.table('verification_apps').get(req.params.id).delete().run()
  })
});


router.get('/:id/remove', user.configure, user.auth, user.mod, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});
    res.render('staff/remove', { title: 'Remove Bot' })
})
});

router.post('/:id/remove', user.configure, user.auth, user.mod, (req, res, next) => {
  r.table('bots').get(req.params.id).run(async (error, bot) => {
    if (!bot) return res.status(400).render('error', { title: 'Error', status: 400, message: 'Bot does not exist.'});

    r.table('bots_backup').insert({
      id: bot.id,
      name: bot.username,
      avatar: bot.avatar,
      prefix: bot.prefix,
      library: bot.library,
      invite: bot.invite,
      short_desc: bot.short_desc,
      long_desc: bot.long_desc,
      support_server: bot.support,
      github: bot.github,
      website: bot.website,
      owner: bot.owner,
      owners: bot.owners,
      server_count: bot.server_count,
      token: bot.token,
      mod_notes: req.body.notes,
      remove_time: Date.now() + 1209600000
    }).run();

    let owners = bot.owners;
    owners.unshift(bot.owner);
    let botDevs = owners.map((dev) => {
      return '<@' + dev + '>'
      }).join(', ');
    if (bot.approved == true) {
      if (client.guilds.get(settings.guildID).members.find(u => u.id == bot.id)) {
        try {
          await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).kick('Bot removed by ' + req.user.username + ' (' + req.user.id + ') - ' + req.body.extra)
        } catch(e) {
          console.log("Failed to kick bot.")
        }
      }
      try {
        await client.users.get(bot.owner).send("\:hammer: Your bot \`" + bot.name + "\` <@" + bot.id + "> has been removed by <@" + req.user.id + ">\n\:page_facing_up: Reason: \`" + req.body.extra + "\`")
      } catch(e) {
        console.log("Failed to DM owner.")
      }
      r.table('bots').get(req.params.id).delete().run()
      client.channels.get(settings.channels.weblog).send("\:wastebasket: <@" + req.user.id + "> removed \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs + " with reason `" + req.body.reason + "`\n" + req.body.extra)
      res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully removed bot.'});
    } else {
      if (client.guilds.get(settings.guildID).members.find(u => u.id == bot.id)) {
        try {
          await client.guilds.get(settings.guildID).members.find(u => u.id == bot.id).kick('Bot removed by ' + req.user.username + ' (' + req.user.id + ') - ' + req.body.extra)
        } catch(e) {
          console.log("Failed to kick bot.")
        }
      }
      try {
        await client.users.get(bot.owner).send("\:hammer: Your bot \`" + bot.name + "\` <@" + bot.id + "> has been denied by <@" + req.user.id + ">\n\:page_facing_up: Reason: \`" + req.body.extra + "\`")
      } catch(e) {
        console.log("Failed to DM owner.")
      }
      r.table('bots').get(req.params.id).delete().run()
      client.channels.get(settings.channels.weblog).send("\:wastebasket: <@" + req.user.id + "> denied \`" + bot.name + "\` <@" + bot.id + "> by " + botDevs + " with reason `" + req.body.reason + "`\n" + req.body.extra)
      res.status(200).render('error', { title: 'Success', status: 200, message: 'Successfully denied bot.'});
    }
})
})

router.get('/:id', user.configure, async (req, res, next) => {
  const bot = await r.table('bots').get(req.params.id).merge(bot => ({
    ownerinfo: bot('owners')
      .default([])
      .append(bot('owner'))
      .map(id => r.table('users').get(id))
      .default({ username: 'Unknown', tag: 'Unknown#0000' })
  })).run()
  if (!bot) return res.status(404).render('error', { title: 'Error', status: 404, message: 'Bot does not exist.' });
  let desc = '';
  desc = marked(bot.long_desc);
	res.render('bots/view', { title: bot.name, bot, desc })
});



module.exports = router