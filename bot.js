import { sleep, pinging, log, makeCommandString } from './util.js'

import discord, { MessageEmbed } from 'discord.js';
const { Client } = discord;


import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const config = require("./conf.json");

import { registeredListenersClasses } from './components/MessageListener.js'

import { TestCommand } from './components/TestCommand.js';
import { OverloadCommand } from './components/OverloadCommand.js';
import { Connect4Command } from './components/Connect4.js';
import { EndGameCommand } from './components/EndGameCommand.js';
import { HelpCommand } from './components/HelpCommand.js';
import { SayCommand } from './components/SayCommand.js';
import { EightBallCommand } from './components/EightBallCommand.js';

import { commands } from './CommandMap.js';

import request from 'request';

const prefix = config.prefix;
const bot = new Client({
	intents: [
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILDS"
	]
});

/*
const vision = require('@google-cloud/vision');
const vision_client = new vision.ImageAnnotatorClient();
*/

const imageSearchBaseURL = 'https://images.google.com/searchbyimage?image_url=';
class ImageSearchCommand {

	get description() {
		return 'Search up the top google result for an image attachment, image link, or the most recent image posted in chat.'
	}

	get icon() {
		return '🔎'
	}

	get arguments() {
		return ['[image url **OR** image attachment]']
	}

	get alias() {
		return ['imgsearch', 'ims'];
	}

	getImageFromMessage(message) {
		for(var attchFlake of message.attachments) {
			const attachment = attchFlake[1];
			
			if(!isNaN(attachment.height)) return attachment.url;
		}
		return null;
	}
	
	getNextGoogleResult(html) {
		
		var index = html.indexOf('<h3 class="LC20lb">');
		var index2 = html.indexOf('</h3>', index);
		
		log("getNextGoogleResult()", index, "index1", this);
		log("getNextGoogleResult()", index2, "index2", this);
		
		return [html.substring(index, index2), html.substring(index2)];
	}	

	async run(args, bot, message) {

		message.channel.send("This command is temporarily disabled due to Google services requiring funds to use their vision API. Come back later!");
		return;
	
		//get back to all this when i get payment stuff figured out
	
		var img = null;

		if(args.length == 0) {
			img = this.getImageFromMessage(message);

			if(img == null) {
				await message.channel.fetchMessages({limit:10})
				.then((messages => {
					for(var mColl of messages) {
						const msg = mColl[1];

						const msgImg = this.getImageFromMessage(msg);

						log("msgImg", msgImg, this);
						
						if(msgImg !== null) 
						{
							img = msgImg;
							break;
						}
					}
				}).bind(this));
					
				if(img == null) {
					message.channel.send("There are no recent images sent in this channel! Try specifying an image (or image link) instead.")
					return;
				}
			}
		} else {
			img = args[0]; //need to do detection stuff

		}
		
		//if(img != null)
		request(imageSearchBaseURL + img, (function(err, response, body) {
			//body.querySelectorAll('h3')
			
			console.log(body);
			
			var result = this.getNextGoogleResult(body)[0];
			
			console.log(result);
		}).bind(this));
			
		//const results = await vision_client.labelDetection(img);
		//console.log(results.labelAnnotations.join(' '));

	}
}

/* initialize bot commands */
commands.set("Test", new TestCommand());
commands.set("Overload", new OverloadCommand());
commands.set("Say", new SayCommand());
commands.set("Connect4", new Connect4Command());
commands.set("End Game", new EndGameCommand());
//commands.set("Image Search", new ImageSearchCommand());
commands.set("Help", new HelpCommand());
commands.set("8Ball", new EightBallCommand());


bot.on('ready', () => {

	console.log("bot running.");
	bot.user.setActivity("Hanny's number 1 fan 💋 ( " + makeCommandString(commands.get('Help')) + " for info )");

});

bot.on('messageCreate', async msg => {
	if(msg.author.bot) return;

	registeredListenersClasses.forEach(c => c.listenEvent(msg));

	if(!msg.content.startsWith(prefix)) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/g);
	const cmd = args.shift().toLowerCase();

	for(var commandPair of commands) {
		if(commandPair[1].alias.includes(cmd)) {

			console.log("Running command " + cmd); //TODO: better logging
			commandPair[1].run(args, bot, msg, cmd);

			return;
		}
	}
});

bot.login(config.token);
