class Command {

    constructor(run=(args, bot, message)=>await message.channel.send("This command has unconfigured run behavior"),
                description="Default command description.", 
                icon="",
                alias=[""]
    ) {
        this.description = description;
        this.icon = icon;
        this.alias = alias;
        this.runfunc = run;
    }

	get description() {
        return this.description;
	}

	get icon() {
		return this.icon;
	}

	get alias() {
        return this.alias;
	}

	async run(args, bot, message) {
        this.runfunc(args, bot, message);
	}

}