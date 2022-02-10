import Command from "../command.js";
import { commands } from "../CommandMap.js";
import { MessageEmbed } from 'discord.js';
import { makeCommandString } from '../util.js';

//TODO: update to use reacts for moving pages
export class HelpCommand extends Command {

    constructor() {
        super(
            (args, bot, msg, lbl) => this.run(args, bot, msg, lbl),
            'Lists information on all the commands this bot has to offer.',
            '🤔',
            ['help'],
            '[page number]'
        )
    }

	async run(args, bot, message) {
		var embed = new MessageEmbed()
					.setTitle("❔ Help ❔")
					//.setFooter("Requested by " + message.author.username + ".")
					.setColor('RANDOM')
					.setDescription('🔑 **[KEY]** \n<> = required argument\n[] = optional argument'); //need to see about this

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

		embed.setFooter({text: "[Page " + onPage + "/" + totalPages + "] Specify a page number to see it. (for instance " + makeCommandString(this) + " " + (Math.floor(Math.random() * totalPages) + 1) + ")"});

		//embed.addBlankField();
		for(var i = startIndex ; i < (startIndex + howManyToShow > commands.size ? commands.size-1 : startIndex + howManyToShow) ; i++) {
			const key = Array.from(commands.keys())[i];
			const cmd = commands.get(key);

			embed.addField((typeof cmd.icon !== "undefined" ? cmd.icon : "") + key + " ( " + makeCommandString(cmd) + (typeof cmd.args !== "undefined" ? " " + cmd.args : "" ) + " )",
			 				typeof cmd.description !== "undefined" ? cmd.description : "Description not available.\n");
			//embed.addField("\ ");
		}

		await message.channel.send({embeds: [embed]});
	}
}