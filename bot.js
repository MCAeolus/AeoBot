import { sleep, pinging, log, makeCommandString } from './util.js'

import discord, { MessageEmbed } from 'discord.js';
const { Client } = discord;

import process from 'node:process';

import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const config = require("./conf.json");

import { registeredListenersClasses } from './components/MessageListener.js'
import { storageManager } from './components/Storage.js';

import { TestCommand } from './components/TestCommand.js';
import { OverloadCommand } from './components/OverloadCommand.js';
import { Connect4Command } from './components/Connect4.js';
import { EndGameCommand } from './components/EndGameCommand.js';
import { HelpCommand } from './components/HelpCommand.js';
import { SayCommand } from './components/SayCommand.js';
import { EightBallCommand } from './components/EightBallCommand.js';
import { WordleCommand } from './components/WordleStats.js';

import { commands } from './CommandMap.js';

const prefix = config.prefix;
const bot = new Client({
	intents: [
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILDS",
		"GUILD_MEMBERS"
	]
});

/*
const vision = require('@google-cloud/vision');
const vision_client = new vision.ImageAnnotatorClient();
*/

/* initialize bot commands */
commands.set("Test", new TestCommand());
commands.set("Overload", new OverloadCommand());
commands.set("Say", new SayCommand());
commands.set("Connect4", new Connect4Command());
commands.set("End Game", new EndGameCommand());
//commands.set("Image Search", new ImageSearchCommand());
commands.set("Help", new HelpCommand());
commands.set("8Ball", new EightBallCommand());
commands.set("Wordle", new WordleCommand());


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

process.on('SIGINT', (e) => {
	console.log("Running onExit() in storage manager.");
	storageManager.onExit();
	process.exit();
});

process.on('beforeExit', () => {
	console.log("on exit");
	storageManager.onExit();
})

process.on('uncaughtException', (err) => {
	console.log(err);
	console.log("An error occured.")
	storageManager.onExit();
	process.exit();
})