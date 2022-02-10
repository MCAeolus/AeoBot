import Command from "../command.js";

export class SayCommand extends Command {

    constructor() {
        super (
            (args, bot, msg, lbl) => this.run(args, bot, msg, lbl),
            'Make the bot say whatever you want!',
            '📣',
            ['say'],
            '<text to say>'
        )
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