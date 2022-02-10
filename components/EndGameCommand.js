import Command from "../command.js";
import { commands } from "../CommandMap.js"

export class EndGameCommand extends Command {

    constructor() {
        super(
            (args, bot, message, cmdLabel) => this.run(args, bot, message),
            'This command will stop any games you are currently playing in.',
            '🛑',
            ['endgame', 'eg']
        )
    }

	async run(args, bot, message) {
		if(!commands.get("Connect4").endPlayerSession(message.author)) {
			await message.channel.send("You aren't currently in a game!");
			return
		}

		await message.channel.send("Game ended.");
	}
}