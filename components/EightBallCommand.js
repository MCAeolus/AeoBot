import Command from "../command.js";

export class EightBallCommand extends Command {

	constructor() {
        super (
            (args, bot, msg, lbl) => this.run(args, bot, msg, lbl),
            'Ask the omniscient bot a yes or no question and get it\'s factual answer.',
            '🎱',
            ['8ball'],
            '<your question>'
        )

		this.positive = ['It is certain.', 'My sources say yes.', 'As I see it, yes.', 'Without a doubt.','It is decidedly so.', 'Yes - definitely.', 'You may rely on it.', 'Yes.', 'Absolutely.', 'Most likely.', 'Outlook good.', 'Signs point to yes.'];
		this.negative = ["Don't count on it", 'My reply is no.', 'My sources say no.', 'Very doubtful.', 'Outlook not so good.', 'No.', 'Definitely not.', 'My sources say no.']
	}

	async run(args, bot, message) {
		if(args.length == 0) {
			message.channel.send("What is your question?");
			return;
		}


		var content = args.join(' ').toLowerCase();

		message.channel.send((Math.random() < 0.5) ? this.positive[Math.floor(Math.random() * this.positive.length)] : this.negative[Math.floor(Math.random() * this.negative.length)] );
	}
}