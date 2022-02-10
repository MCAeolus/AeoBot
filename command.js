export class Command {

    constructor(run=async (args, bot, message, cmdLabel)=>await message.channel.send("This command has unconfigured run behavior"),
                description="Default command description.", 
                icon="",
                alias=[""],
                args="",
        ) {
                this.description = description;
                this.icon = icon;
                this.alias = alias;
                this.args = args;
                this.runfunc = run;
        }

	description() {
                return this.description;
	}

	icon() {
		return this.icon;
	}

	alias() {
                return this.alias;
	}

        arguments() {
                return this.args;
        }

	async run(args, bot, message, cmdLabel) {
                this.runfunc(args, bot, message, cmdLabel);
	}

}

export default Command;