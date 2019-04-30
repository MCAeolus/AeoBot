function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function pinging(user) {
	return "<@" + user.id + ">"
}

const debugMode = true;

function log(prop, val, inf, clazz) {
	if(debugMode) console.log((typeof clazz !== 'undefined' ? clazz.constructor.name : "") + "#" + prop + " " + inf + "=" + val)
}

const discord = require('discord.js');
const bot = new discord.Client();

const config = require('./conf.json');

const request = require('request');

const prefix = '%';

/*
const vision = require('@google-cloud/vision');
const vision_client = new vision.ImageAnnotatorClient();
*/

function makeCommandString(cmd) {
	return prefix + cmd.alias[0]
}

class TestCommand {

	get description() {
		return 'The first command made for this bot. Displays the word \'testing\'.'
	}

	get icon() {
		return '🤖'
	}

	get alias() {
		return ['test','t','try','temp'];
	}

	async run(args, bot, message) {

		var m = await message.channel.send("testing...");
		m.react('✅');

		const word = "testing..."

		for(var i = 0; i < word.length; i++) {
			await sleep(250);
			m.edit("◼️".repeat(i) + word.slice((i - 1 < 0) ? 0 : i - 1, i) + "◼️".repeat(word.length-1 - i))
		}
		m.delete(5000).catch();
		message.delete();
	}

}

class OverloadCommand {

	get description() {
		return 'This is the bot\'s other original command. Reacts with all the current emojis uploaded to the server.'
	}

	get icon() {
		return '🙀'
	}

	get alias() {
		return ['overload', 'ol'];
	}

	async run(args, bot, message) {
		bot.emojis.array().forEach(
			e => {
			message.react(e);
		});
	}
}

class Connect4Command {

	constructor() {
		this.sessions = [];
	}

	get description() {
		return 'Play a game of Connect 4 with a friend!'
	}

	get icon() {
		return '🔴';
	}

	get arguments() {
		return '<@user>'
	}

	get alias() {
		return ['connect4'];
	}

	isCreatedMatch(user) {
		for(var session of this.sessions)
			if(session.player1.id === user.id || session.player2.id === user.id) return true;

		return false;
	}

	endSession(session) {
		this.sessions = this.sessions.filter((val, index, arr) => val != session);
		session.sessionEnded = true;
		session.endSession();
	}

	endPlayerSession(user) {
		if(this.isCreatedMatch(user)) {
			for(var session of this.sessions) {
				if(session.player1.id === user.id || session.player2.id === user.id) {
					this.endSession(session);
					return true;
				}
			}
		}
		return false;
	}

	async timeoutMessage(original, sending, timeout, userTimeout) {
		var m = await original.channel.send(sending)
		if(userTimeout >= 0) original.delete(userTimeout).catch();
		if(timeout > 0) m.delete(timeout).catch();
	}

	async run(args, bot, message, cmdLabel) {
		if(args.length == 0) {
			this.timeoutMessage(message, "❌ Please specify a user to play Connect 4 with. (example usage: " + makeCommandString(this) + " " + pinging(message.author) + ")", 5000, 0)
			return;
		} else {
			const user1 = message.author;
			const user2 = await bot.fetchUser(args[0].slice(2,args[0].length - 1)).catch(
			er => {
				this.timeoutMessage(message, "❌ Invalid user specified! (example usage: " + makeCommandString(this) + " " + pinging(message.author) + ")", 5000, 5000)
				return
			})

			if(user2 === user1) {
				this.timeoutMessage(message, "❌ You cannot play by yourself!", 5000, 0);
				return
			}

			if(this.isCreatedMatch(user1)) {
				this.timeoutMessage(message, "❌ You have already sent an invite or are in a match! (to end your session, type " + makeCommandString(commands.get('End Game')) + ")", 5000, 0)
				return
			}else if(this.isCreatedMatch(user2)) {
				this.timeoutMessage(message, "❌ Specificed user is either already invited to a session or is currently playing a game!", 5000, 0)
				return
			}

			var newSession = new Connect4Session(user1, user2, message.channel, this);
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

const redMarker = "🔴";
const blueMarker = "🔵";
const emptyMarker = "⬛";

class Connect4Session {

	/**
		- new message sent per player turn
		- message edited during turn
			* signify updates to cursor
			*


		- customize your marker
		- list a number instead of reactions
	**/

	constructor(player1, player2, channel, controller) {
		this.player1 = player1;
		this.player2 = player2;

		this.channel = channel;

		this.controller = controller;

		this.isSessionStarted = false;
		this.sessionEnded = false;

		this.width = 7;
		this.height = 6;

		this.map = Array(this.height).fill(0).map(x => Array(this.width).fill(emptyMarker));

		this.boardMessage = null;

		this.playerOnRed = (Math.random() < 0.5) ? this.player1 : this.player2

		this.currentPlayingUser = null;
		this.lockNewInputs = false;
	}

	/** old method using reacts for cursor position
	async createControls(user) {
		if(this.boardMessage != null) {
			this.boardMessage.react("⬅")
			await sleep(500)
			this.boardMessage.react("👍");
			await sleep(500)
			this.boardMessage.react("➡");


			var collectorLeft = this.boardMessage.createReactionCollector((react, use) => use.id === user.id && react.emoji.name === "⬅", {time:15000} )
			var collectorRight = this.boardMessage.createReactionCollector((react, use) => use.id === user.id && react.emoji.name === "➡", {time:15000} )
			var collectorChoose = this.boardMessage.createReactionCollector((react, use) => use.id === user.id && react.emoji.name === "👍", {time:15000} )

			this.cursorPosition = 0;

			var isAlreadyFinished = false;

			collectorLeft.on('collect', (r => {
				this.cursorPosition = this.cursorPosition > 0 ? this.cursorPosition - 1 : 0;
				this.updateCursor();
				return;
			}).bind(this))
			collectorRight.on('collect', (r => {
				this.cursorPosition = this.cursorPosition < (this.width - 1) ? this.cursorPosition + 1 : (this.width - 1);
				this.updateCursor();
				return;
			}).bind(this))
			collectorChoose.on('collect', (r => {
				isAlreadyFinished = this.playFromPosition(user);
				return;
			}).bind(this))


			collectorLeft.on('end', (e => {
				if(!isAlreadyFinished) this.finishTurn(user);
			}).bind(this));


			this.channel.send(pinging(user) + ", it's your turn!");

		}
	}
	**/

	async playFromPosition(user, position) {
		if(this.map[0][position] !== emptyMarker) {
			this.channel.send("That column is full!");
			this.lockNewInputs = false;
			return false
		}

		var marker = (user === this.playerOnRed) ? redMarker : blueMarker;
		var location = null;
		for(var i = 0; i < this.height; i++) {
			if(this.map[i][position] === emptyMarker) {
				if(i == this.height-1) {
					this.map[i][position] = marker;
					location = {
						x:position,
						y:i
					}
					break;
				}
				else if(this.map[i + 1][position] === emptyMarker) continue;
				else {
					this.map[i][position] = marker;
					location = {
						x:position,
						y:i
					}
					break;
				}
			}
		}

		if(this.checkIfWon(location, marker)) {
			this.boardMessage = await this.drawBoard();
			this.channel.send("⭐ " + pinging(user) + " wins! ⭐");
			this.controller.endSession(this);

			return true;
		} else if(this.isStaleMate()) {
			this.boardMessage = await this.drawBoard();
			this.cannel.send("It's a tie! The board has been filled. Game over!");
			this.controller.endSession(this);

			return true;
		}

		this.finishTurn(user);
		return true;
	}

	isStaleMate() {
		return !this.map.join('').includes(emptyMarker);
	}

	/**
	  -  -  -
	 *  [] -      x:(-1 -> 1)
	 *  *  * 	  y:(0 -> 1)
	**/

	checkIfWon(location, marker) {

		var relativeDirections = [
			{x:-1, y:1},
			{x:0, y:1},
			{x:1, y:1},
			{x:1, y:0}
		]

		for(const relVector of relativeDirections) {
			var reciprocal = {x:-relVector.x, y:-relVector.y}

			var sum = 1;

			var relX = location.x + relVector.x;
			var relY = location.y + relVector.y;

			var repX = location.x + reciprocal.x;
			var repY = location.y + reciprocal.y;

			sum += this.resolveDirection({x:relX, y:relY}, relVector, marker)
			sum += this.resolveDirection({x:repX, y:repY}, reciprocal, marker)

			if(sum >= 4) return true;
		}

		return false;
	}

	resolveDirection(location, direction, marker) {
		var sum = 0;
		if((location.x < this.width && location.y < this.height) && (location.x >= 0 && location.y >= 0))
			if(this.map[location.y][location.x] === marker)
				sum = 1 + this.resolveDirection({x:(location.x+direction.x), y:(location.y+direction.y)}, direction, marker);

		return sum;
	}

	async finishTurn(user) {
		if(this.sessionEnded) return;

		this.boardMessage = await this.drawBoard();
		this.currentPlayingUser = this.flipPlayer(user);
		this.channel.send(pinging(this.currentPlayingUser) + ", it's your turn!");
		this.lockNewInputs = false;
	}

	/**
		- check from last placed marker...
	**/

	/**
	updateCursor() {
		var embed = new discord.RichEmbed()
					.setTitle("Connect4")
					.setAuthor(this.player1.username + " vs. " + this.player2.username)
					.setFooter("You have 15 seconds to choose your move.");

		embed.addField("Cursor", emptyMarker.repeat(this.cursorPosition) + positionalMarker + emptyMarker.repeat((this.width-1) - this.cursorPosition));
		embed.addField("Map", this.map.join("\n").replace(/,/g, ''));

		this.boardMessage.edit({embed});
	}
	**/

	endSession() {
		if(this.boardMessage != null) {
			//this.boardMessage.delete();
			this.channel.send("Game was ended!");
		}
		removeListener(this);
	}

	async drawBoard() {
		var embed = new discord.RichEmbed()
					.setTitle("Connect4")
					.setAuthor(this.playerOnRed.username + redMarker + " vs. " + blueMarker + this.flipPlayer(this.playerOnRed).username)
					//.setFooter("You have 15 seconds to choose your move.");


		embed.addField("Map", "1⃣2⃣3⃣4⃣5⃣6⃣7⃣" + "\n" +
							  this.map.join("\n").replace(/,/g, ''));

		//this.map.forEach(a => embed.addField("",a.join("")));


		return await this.channel.send({embed});
	}

	flipPlayer(user) {
		return (this.player1 === user)? this.player2 : this.player1
	}

	async startSession() {
		if(this.isSessionStarted == false) {
			registeredListenersClasses.push(this);

			this.isSessionStarted = true
			this.boardMessage = await this.drawBoard();
			this.currentPlayingUser = this.playerOnRed;
			this.channel.send("Alright " + pinging(this.playerOnRed) + ", it's your turn!")
		}
		else return;
	}

	listenEvent(msg) {
		if(this.currentPlayingUser !== null && this.currentPlayingUser.id === msg.author.id && !this.lockNewInputs) {
			if(msg.content === prefix + "endgame" || msg.content === prefix + "eg") return;


			var num = parseInt(msg.content);
			msg.delete();
			if(isNaN(num) || num > this.width || num < 1)
				this.channel.send("That's not a valid number! Try again.");
			else {
				this.lockNewInputs = true;
				this.playFromPosition(this.currentPlayingUser, num-1)
			}
		}
	}

}

class CheckersCommand {

} //TODO

class EndGameCommand {

	get description() {
		return 'This command will stop any games you are currently playing in.'
	}

	get icon() {
		return '🛑';
	}

	get alias() {
		return ['endgame', 'eg'];
	}

	async run(args, bot, message) {
		if(!commands.get("Connect4").endPlayerSession(message.author)) {
			await message.channel.send("You aren't currently in a game!");
			return
		}

		await message.channel.send("Game ended.");
	}
}

class SayCommand {

	get description() {
		return 'Make the bot say whatever you want!'
	}

	get icon() {
		return '📣'
	}

	get arguments() {
		return '<text to say>'
	}

	get alias() {
		return ['say'];
	}

	async run(args, bot, message, cmd) {
		if(args.length == 0) {
			var m = await message.channel.send("You must specify what you want to say! ( for example " + makeCommandString(this) + " AeoBot is the best! )");
			m.delete(10000);
			return;
		}

		var rem = args.join(" ");

		var m = await message.channel.send(rem);
		message.delete();
	}
}

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

		//message.channel.send("This command is temporarily disabled due to Google services requiring funds to use their vision API. Come back later!");
		//return;
	
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

class EightBallCommand {

	constructor() {
		this.positive = ['It is certain.', 'My sources say yes.', 'As I see it, yes.', 'Without a doubt.','It is decidedly so.', 'Yes - definitely.', 'You may rely on it.', 'Yes.', 'Absolutely.', 'Most likely.', 'Outlook good.', 'Signs point to yes.'];
		this.negative = ["Don't count on it", 'My reply is no.', 'My sources say no.', 'Very doubtful.', 'Outlook not so good.', 'No.', 'Definitely not.', 'My sources say no.']
	}

	get description() {
		return 'Ask the omniscient bot a yes or no question and get it\'s factual answer.'
	}

	get icon() {
		return '🎱';
	}

	get arguments() {
		return '<your question>'
	}

	get alias() {
		return ['8ball'];
	}

	async run(args, bot, message) {
		if(args.length == 0) {
			message.channel.send("What is your question?");
			return;
		}


		var content = args.join(' ').toLowerCase();

		if(( content.includes('hanny') || content.includes('rextheclone') )&&(content.includes('gay') || content.includes('homo') || content.includes('homosexual') || content.includes('faggot') || content.includes('fag')))
			message.channel.send(this.positive[Math.floor(Math.random() * this.positive.length)])
		else
			message.channel.send((Math.random() < 0.5) ? this.positive[Math.floor(Math.random() * this.positive.length)] : this.negative[Math.floor(Math.random() * this.negative.length)] );
	}
}

class HelpCommand {

	get icon() {
		return '🤔';
	}

	get description() {
		return 'Lists information on all the commands this bot has to offer.'
	}

	get arguments() {
		return '[page number]'
	}

	get alias() {
		return ['help']
	}

	async run(args, bot, message) {
		var embed = new discord.RichEmbed()
					.setTitle("❔ Help ❔")
					//.setFooter("Requested by " + message.author.username + ".")
					.setColor('RANDOM')
					.setDescription('🔑\n<> = required argument\n[] = optional argument'); //need to see about this

		const howManyToShow = 4;
		var startIndex = 0;

		const totalPages = Math.ceil(commands.size / howManyToShow)
		var onPage = 1;

		if(args.length > 0) {
			const count = parseInt(args[0]);
			if(!isNaN(count))
				if(count <= totalPages) {
					startIndex = ((count-1) * howManyToShow)
					onPage = count;
				} else {
					message.channel.send("❌ The page number specified is not available!")
					return;
				}
		}

		embed.setFooter("[Page " + onPage + "/" + totalPages + "] Specify a page number to see it. (for instance " + makeCommandString(this) + " " + (Math.floor(Math.random() * totalPages) + 1) + ")");

		//embed.addBlankField();
		for(var i = startIndex ; i < (startIndex + howManyToShow > commands.size ? commands.size-1 : startIndex + howManyToShow) ; i++) {
			const key = Array.from(commands.keys())[i];
			const cmd = commands.get(key);

			embed.addField((typeof cmd.icon !== "undefined" ? cmd.icon : "") + key + " ( " + makeCommandString(cmd) + (typeof cmd.arguments !== "undefined" ? " " + cmd.arguments : "" ) + " )",
			 				typeof cmd.description !== "undefined" ? cmd.description : "Description not available.");
			embed.addBlankField();
		}

		await message.channel.send({embed});
	}
}

const commands = new Map();
commands.set("Test", new TestCommand());
commands.set("Overload", new OverloadCommand());
commands.set("Say", new SayCommand());
commands.set("Connect4", new Connect4Command());
commands.set("End Game", new EndGameCommand());
commands.set("Image Search", new ImageSearchCommand());
commands.set("Help", new HelpCommand());
commands.set("8Ball", new EightBallCommand());

//const commands = [new TestCommand(), new OverloadCommand(), new SayCommand(), new Connect4Command(), new EndGameCommand(), new ImageSearchCommand(), new HelpCommand(), new EightBallCommand()];
//commands[4].connect4command = commands[3];

bot.on('ready', () => {

	console.log("bot running.");
	bot.user.setActivity("Hanny's number 1 fan 💋 ( " + makeCommandString(commands.get('Help')) + " for info )");

});

var registeredListenersClasses = [];

function removeListener(listener) {

	registeredListenersClasses = registeredListenersClasses.filter((val, index, arr) => val !== listener);

}

bot.on('message', async msg => {
	if(msg.author.bot) return;

	registeredListenersClasses.forEach(c => c.listenEvent(msg));

	if(!msg.content.startsWith(prefix)) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/g);
	const cmd = args.shift().toLowerCase();

	for(var commandPair of commands) {
		if(commandPair[1].alias.includes(cmd)) {

			console.log("Running command " + cmd);
			commandPair[1].run(args, bot, msg, cmd);

			return;
		}
	}
});

bot.login(config.token);
