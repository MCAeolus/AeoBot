import { Command } from "../command.js";

export class OverloadCommand extends Command {
	constructor() {
		super(
			(args, bot, message) => {
				bot.emojis.array().forEach(
					e => {
					message.react(e);
				});
			},
			"This is the bot's other original command. Reacts with all the current emojis uploaded to the server.",
			'🙀',
			['overload', 'ol']
		)
	}
}

export default OverloadCommand;