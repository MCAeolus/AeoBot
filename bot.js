function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
		
	}
	
}

class OverloadCommand {
	
	get alias() {
		return ['overload', 'ol'];
	}
	
	async run(args, bot, message) {
		var m = await message.channel.send("t");
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
	
	async run(args, bot, message) {
		if(args.length == 0) {
			message.channel.send("❌ Please specify a user to play Connect 4 with. (ex. " + prefix + connect4[0] + " " + message.author.tag + " )");
			return;
		}
		
		else {
			
			
			//sessions.put(new Connect4Session(message.sender
			
		}

	}
	
}
class Connect4Session {
		
	constructor(player1, player2) {
		this.player1 = player1;			
		this.player2 = player2;
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
			cmdClass.run(args, bot, msg);
		
			return;
		}
		
	}
});


bot.login(config.token);

