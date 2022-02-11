import { Command } from '../command.js';
import { addListener, removeListener } from './MessageListener.js';
import { pinging, sleep } from '../util.js';

const redMarker = "🔴";
const blueMarker = "🔵";
const emptyMarker = "⬛";

export class Connect4Command extends Command {

	constructor() {
        super(
            (args, bot, message, cmdLabel) => this.run(args, bot, message, cmdLabel),
            'Play a game of Connect 4 with a friend!',
            '🔴',
            ['connect4'],
            '<@user>'
        )
		this.sessions = [];
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
		if(userTimeout >= 0) original.delete({timeout: userTimeout}).catch();
		if(timeout > 0) m.delete({timeout: timeout}).catch();
	}

    async run(args, bot, message, cmdLabel) {
        if(args.length == 0) {
            this.timeoutMessage(message, "❌ Please specify a user to play Connect 4 with. (example usage: " + makeCommandString(this) + " " + pinging(message.author) + ")", 5000, 0)
            return;
        } else {
            const user1 = message.author;
            const mention = args[0].slice(3, args[0].length - 1);
            const user2 = bot.users.cache.get(mention);

            if (user2 == null) {
                this.timeoutMessage(message, "❌ Invalid user specified! (example usage: " + makeCommandString(this) + " " + pinging(message.author) + ")", 5000, 5000);
                return;
            }

            if(user2 === user1) {
                this.timeoutMessage(message, "❌ You cannot play by yourself!", 5000, 5000);
                return;
            }

            if (user2.bot) {
                this.timeoutMessage(message, "❌ You cannot play with bots! (example usage: " + makeCommandString(this) + " " + pinging(message.author) + ")", 5000, 5000);
                return;
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

            //acceptingMessage.delete({timeout: 30000}).catch();
            
            const filter = (reaction, user) => ['✅', '❎'].includes(reaction.emoji.name) && user.id === user2.id;
            acceptingMessage.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();

                if (reaction.emoji.name === '✅')  {
                    acceptingMessage.delete();
                    message.channel.send(pinging(user1) + ", " + user2.username + " accepted your game!");
                    newSession.startSession();
                } else {
                    acceptingMessage.delete();
                    message.channel.send(pinging(user1) + ", " + user2.username + " denied your game.");
                    this.endSession(newSession);	
                }
                message.delete();
            })
            .catch(collected => {
                acceptingMessage.delete();
                this.endSession(newSession);
                this.timeoutMessage(message, "❌ Session timed out.", 5000, 5000)
            });
        }
    }
}

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
		var embed = new MessageEmbed()
					.setTitle("Connect4")
					.setAuthor({name: this.playerOnRed.username + redMarker + " vs. " + blueMarker + this.flipPlayer(this.playerOnRed).username})
					//.setFooter("You have 15 seconds to choose your move.");


		embed.addField("Map", "1⃣2⃣3⃣4⃣5⃣6⃣7⃣" + "\n" +
							  this.map.join("\n").replace(/,/g, ''));

		//this.map.forEach(a => embed.addField("",a.join("")));


		return await this.channel.send({embeds: [embed]});
	}

	flipPlayer(user) {
		return (this.player1 === user)? this.player2 : this.player1
	}

	async startSession() {
		if(this.isSessionStarted == false) {
			addListener(this);

			this.isSessionStarted = true
			this.boardMessage = await this.drawBoard();
			this.currentPlayingUser = this.playerOnRed;
			this.channel.send("Alright " + pinging(this.playerOnRed) + ", it's your turn!")
		}
		else return;
	}

	listenEvent(msg) {
		if(this.currentPlayingUser !== null && this.currentPlayingUser.id === msg.author.id && !this.lockNewInputs) {
			if(msg.content === prefix + "endgame" || msg.content === prefix + "eg") return; //This should be updated


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
