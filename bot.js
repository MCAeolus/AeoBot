function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pinging(user) {
  return "<@" + user.id + ">"
}

const discord = require('discord.js');
const bot = new discord.Client();

const config = require('./conf.json');

const prefix = '%';

class TestCommand {

	get alias() {
		return ['test','t','try','temp'];
	}

	async run(args, bot, message) {

		var m = await message.channel.send("testing...");
		m.react('✅');

    const word = "testing..."
    for(var i = 0; i <= word.length; i++) {
      await sleep(250);
      m.edit("◼️".repeat(i) + word.slice((i - 1 < 0) ? 0 : i - 1, i) + "◼️".repeat(word.length - i))
    }
    await sleep(250);
    m.edit("◼️".repeat(word.length))
    await sleep(500);
    m.delete();
    message.delete();
	}

}

class OverloadCommand {

	get alias() {
		return ['overload', 'ol'];
	}

	async run(args, bot, message) {
		var m = await message.channel.send("all server emojis.");
		bot.emojis.array().forEach(
			e => {
			m.react(e);
		});
	}
}

class Connect4Command {

	constructor() {
		this.sessions = [];
	}

	get alias() {
		return ['connect4'];
	}

  isCreatedMatch(user) {
    this.sessions.forEach(session => {
      if(session.player1.id === user.id || session.player2.id === user.id) return true;
    });
    return false;

  }

  endSession(session) {
    this.sessions = this.sessions.filter((val, index, arr) => val != session);
    session.sessionEnded = true;
    session.endSession();
  }

  async timeoutMessage(original, sending, timeout, userTimeout) {
    var m = await original.channel.send(sending)
    if(userTimeout >= 0) original.delete(userTimeout).catch();
    if(timeout > 0) m.delete(timeout).catch();
  }

	async run(args, bot, message, cmdLabel) {
		if(args.length == 0) {
      this.timeoutMessage(message, "❌ Please specify a user to play Connect 4 with. (example usage: " + prefix + cmdLabel + " " + pinging(message.author) + ")", 5000, 0)
			return;
		}

		else {
      const user1 = message.author;
      const user2 = await bot.fetchUser(args[0].slice(2,args[0].length - 1)).catch(er => {
        this.timeoutMessage(message, "❌ Invalid user specified! (example usage: " + prefix + cmdLabel + " " + pinging(message.author) + ")", 5000, 5000)
        return
      })

      if(this.isCreatedMatch(user1)) {
        this.timeoutMessage(message, "❌ You have already sent an invite or are in a match! (to end your session, type " + prefix + "endsession)", 5000, 0)
        return
      }else if(this.isCreatedMatch(user2)) {
        this.timeoutMessage(message, "❌ Specificed user is either already invited to a session or is currently playing a game!", 5000, 0)
        return
      }

      var newSession = new Connect4Session(user1, user2);
      this.sessions.push(newSession);

      var acceptingMessage = await message.channel.send("👍 " + pinging(user2) + ", you have been invited by " + user1.username + " to play Connect4. Press ✅ to accept, or ❎ to deny the request. This request will timeout in 30 seconds.")
      acceptingMessage.react("✅")
      await sleep(50);
      acceptingMessage.react("❎")

      acceptingMessage.delete(30000).catch();

      var collectorAccept = acceptingMessage.createReactionCollector((react, user) => user.id === user2.id && react.emoji.name === "✅", { time: 30000});
      var collectorDeny = acceptingMessage.createReactionCollector((react, user) => user.id === user2.id && react.emoji.name === "❎", { time: 30000});

      collectorAccept.on('collect', (r => {
        acceptingMessage.delete();
        message.channel.send(pinging(user1) + ", " + user2.username + " accepted your game!");
        newSession.startSession();
        return;
      }).bind(this));

      collectorDeny.on('collect', (r => {
        acceptingMessage.delete();
        message.channel.send(pinging(user1) + ", " + user2.username + " denied your game.");
        this.endSession(newSession);
        return;
      }).bind(this));

      collectorAccept.on('end', (e => {
        if(!newSession.isSessionStarted && !newSession.sessionEnded) {
           this.endSession(newSession);
           this.timeoutMessage(message, "❌ Session timed out.", 5000, 0)
         }
      }).bind(this));

		}

	}

}
class Connect4Session {

	constructor(player1, player2) {
		this.player1 = player1;
		this.player2 = player2;
    this.isSessionStarted = false;
    this.sessionEnded = false;
	}

  endSession() {

  }

  startSession() {
    if(this.isSessionStarted == false) {
      this.isSessionStarted = true

    }
    else return;
  }

}

class SayCommand {

	get alias() {
		return ['say'];
	}

	async run(args, bot, message) {

		var rem = args.join(" ");

		var m = await message.channel.send(rem);
		message.delete();
	}
}

class HelpCommand {

	get alias() {
		return ['help'];
	}

	async run(args, bot, message) {

	}

}

const commands = [new TestCommand(), new OverloadCommand(), new SayCommand(), new HelpCommand(), new Connect4Command()];

bot.on('ready', () => {

	console.log("bot running.");
	bot.user.setActivity("✅ Hanny's number 1 fan 💋 ( " + prefix + "help for info )");



});

bot.on('message', async msg => {

	if(msg.author.bot) return;

	if(!msg.content.startsWith(prefix)) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/g);
	const cmd = args.shift().toLowerCase();

	for(var i = 0; i < commands.length; i++) {
		var cmdClass = commands[i];
		if(cmdClass.alias.includes(cmd)) {

			console.log("Running command " + cmd);
			cmdClass.run(args, bot, msg, cmd);

			return;
		}

	}
});

bot.login(config.token);
