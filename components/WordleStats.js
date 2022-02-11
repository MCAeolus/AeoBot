import { Command } from '../command.js';
import { Storage } from './Storage.js';
import { MessageEmbed } from 'discord.js';
import { addListener } from './MessageListener.js';

class WordleStorage extends Storage {

    constructor() {
        super('Wordle');
    }
    /*
    JSON format as 
    {
        [guildid] : {
            [userid] : {
                "numgames" : int,
                "checked_days" : [int, int ...]
                "win_distribution" : {
                    "1" : int,
                    "2" : int,
                    ..
                    "6" : int,
                    "x": int
                } other data?...
                "leaderboard_score":
            },
            ...
        },
        [guildid2] : {...}
        ...
    }
    */

    getUser(user, guild) {
        var jguild = this.getGuild(guild);

        var juser = jguild[user.id];

        if (juser == null) {
            jguild[user.id] = {};
            juser = jguild[user.id];
            juser.numgames = 0;
            juser.name = user.username;
            juser.checked_days = [];
            juser.win_distribution = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                X: 0
            };
            juser.leaderboard_score = 0;
        }

        if (juser.name !== user.username) juser.name = user.username;
        return juser;   

    }

    getGuild(guild) {
        var jguild = this.json[guild.id];
    
        if (jguild == null) {
            this.json[guild.id] = {};
            jguild = this.json[guild.id];
        }
        return jguild;
    }
}

const scoreMapping = {
    1: 10,
    2: 7,
    3: 4,
    4: 3,
    5: 2,
    6: 1,
    X: 0
}

class WordleStats {

    constructor() {
        this.patternMatch = new RegExp('Wordle [1-9]{3,} ([1-6]|X)\/6');
        addListener(this);
    }

    getStatsFromMessage(msg) {
        if (this.patternMatch.test(msg.content)) {
            const msgArgs = msg.content.split(' ');
            const day = parseInt(msgArgs[1]);

            const scoreStr = msgArgs[2].split('\n')[0].substring(0,1);

            return {
                userid: msg.author.id,
                day: day,
                score: scoreStr
            };
        }
        return null;
    }

    checkAndDoScoreUpdate(msg) {
        const msgcontent = this.getStatsFromMessage(msg);
        if (msgcontent == null) return;

        const juser = wordleStorage.getUser(msg.author, msg.guild);

        if (juser.checked_days.includes(msgcontent.day)) return;
        console.log("New wordle stats found", msgcontent);

        juser.numgames++;
        juser.checked_days.push(msgcontent.day);
        juser.win_distribution[msgcontent.score]++;
        this.calculateLeaderboardScore(msg.author, msg.guild);
    }
    /*
    score = 10*(found in 1) + 7*(found in 2) + 4*(found in 3) + 3*(found in 4) + 2*(found in 5) + (found in 6) 
    score -= 3*(not found)
    */

    calculateLeaderboardScore(user, guild) {
        const juser = wordleStorage.getUser(user, guild);
        var score = 0;
        for (var i = 1; i < 6; i++) {
            score += juser.win_distribution[i]*scoreMapping[i];
        }

        juser.leaderboard_score = score;
    }

    listenEvent(msg) {
        const expectedChannel = wordleChannelMap.get(msg.guild);
        const channel = msg.channel;
        if (expectedChannel == null || expectedChannel.id !== channel.id) return;
        this.checkAndDoScoreUpdate(msg);  
    }
}

const wordleStorage = new WordleStorage();
const wordleStats = new WordleStats();
const wordleChannelMap = new Map();

const distrBar = '🟩';
const spacerBar = '⬛';
const sidebarNumberMap = {
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣'
}

export class WordleCommand extends Command {

    constructor() {
        super (
            (args,bot,msg,lbl) => this.run(args, bot, msg, lbl),
            'Keeps track of wordle stats from any channel named #wordle.',
            '🇼', //regional_indicator_w
            ['wordle', 'wdl'],
            '<sub-command> []'
        )
    }

    findWordleChannel(guild) {
        var retChannel = wordleChannelMap.get(guild);

        if (retChannel == null) {
            for (var channel of guild.channels.cache.values()) {
                if (channel.name.toLowerCase() == "wordle" && channel.isText()) {
                    retChannel = channel;
                    break;
                }
            }
            wordleChannelMap[guild] = retChannel;
        }
        return retChannel;
    }

    async run(args, bot, message, cmdLabel) {
        const wordleChannel = this.findWordleChannel(message.guild);
        if (wordleChannel == null) {
            message.channel.send("❌ This server does not have a #wordle text channel.");
            return;
        }

        if (args.length == 0) {
            const user = wordleStorage.getUser(message.author, message.guild);

            const embed = new MessageEmbed()
                .setTitle(`${message.author.username}'s Wordle Stats`)
                //.setAuthor({name: "Wordle Stats"})
                .addFields(
                    {name: 'Games Played', value: `${user.numgames}`},
                //  {name: '\u200b', value: '\u200b'},
                    {name: 'Win Distribution', value: this.makeWinDistribution(user)},
                    {name: 'Losses', value: `${user.win_distribution.X}`}
                );
            
            message.channel.send({embeds: [embed]});
        } else if (args.length == 1) {
            if (args[0].toLowerCase() === "importhistory") {
                wordleChannel.messages.fetch({ limit: 100 }).then(messages => {
                    messages.forEach(msg => wordleStats.checkAndDoScoreUpdate(msg));
                    wordleStorage.save();
                    message.channel.send("Stats have been imported from this server's #wordle channel.");
                });
            } else if (args[0].toLowerCase() === "leaderboard") {
                const embed = new MessageEmbed()
                    .setTitle(`${message.channel.guild.name}'s Wordle Leaderboard`);

                const leaderList = [];
                const jguild = wordleStorage.getGuild(message.channel.guild);

                for (const jUserKey in jguild) {
                    const juser = jguild[jUserKey];
                    leaderList.push({
                        key: juser.name,
                        val: juser.leaderboard_score,
                        score: juser.leaderboard_score
                    });
                }
                
                leaderList.sort((first, second) => {
                    return second.val - first.val;
                })

                var place = 1;
                for (var leaderentry of leaderList) {
                    embed.addField(`#${place++} - ${leaderentry.score}`, leaderentry.key, true);
                }
                
                message.channel.send({embeds : [embed]});
            }
        }
    }

    makeWinDistribution(juser) {
        if (juser.numgames <= 0) return 'No games played.';
        const gnum = juser.numgames;

        var distrString = "";

        for (var i = 1 ; i <= 6; i++) {

            const percent = Math.round((juser.win_distribution[i] / gnum) * 10);
            const spacer = 10 - percent;

            distrString += 
            `${sidebarNumberMap[i]} | `
             + distrBar.repeat(percent)
             + spacerBar.repeat(spacer)
             + `| ${juser.win_distribution[i]}\n`;
        }
        return distrString;
    }
}