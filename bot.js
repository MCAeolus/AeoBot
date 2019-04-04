const discord = require('discord.js');
const bot = new discord.Client();

const config = require('./conf.json');

const prefix = '%';

const commands = [new TestCommand()];


bot.on('ready', () => {
	
	console.log("bot running.");
	bot.user.setActivity("test ( % )");
	
});


bot.on('message', async msg => {
	
	if(msg.author.bot) return;
	
	const args = message.content.slice(prefix).trim().split(/ +/g);
	const cmd = args.shift().toLowerCase();
	
	for(cmdClass in commands) {
		if(cmdClass.alias.contains(cmd)) {
			
			console.log("Running command " + cmd);
			cmdClass.run(args, bot, msg);
			
		}
		
	}
});


bot.login(config.token);

class TestCommand {
	
	const alias = ['test','t','try','temp'];
	
	function run(args, bot, message) {
		
		const send = await msg.channel.send("testing...");
		m.react(':white_check_mark:');	
		
	}
	
}
