import { Command } from "../command.js";
import { sleep, pinging } from '../util.js'

export class TestCommand extends Command {
    constructor() {
        super(
            async (args, bot, message) => {
                var m = await message.channel.send("testing...");
                m.react('✅');
        
                const word = "testing..."
        
                for(var i = 0; i < word.length; i++) {
                    await sleep(250);
                    m.edit("◼️".repeat(i) + word.slice((i - 1 < 0) ? 0 : i - 1, i) + "◼️".repeat(word.length-1 - i))
                }
                m.delete(5000).catch();
                message.delete();
            },
            "The first command made for this bot. Displays the word 'testing'.",
            '🤖',
            ['test','t','try','temp']
        )
    }
}

export default TestCommand;