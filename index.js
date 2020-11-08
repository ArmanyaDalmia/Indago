const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const ytdl = require("ytdl-core");
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate();
const client = new Discord.Client();
const prefix = "!"; 

var servers = {};

function invoke(action, version, params={}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        console.log('HEREERERE');
        xhr.addEventListener('error', () => reject('failed to issue request'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (Object.getOwnPropertyNames(response).length != 2) {
                    throw 'response has an unexpected number of fields';
                }
                if (!response.hasOwnProperty('error')) {
                    throw 'response is missing required error field';
                }
                if (!response.hasOwnProperty('result')) {
                    throw 'response is missing required result field';
                }
                if (response.error) {
                    throw response.error;
                }
                resolve(response.result);
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        xhr.send(JSON.stringify({action, version, params}));
    });
}

async function translateText(message, text, tar) {
    const toText = text;
    const target = tar;

    let [translations] = await translate.translate(toText, target);
    translations = Array.isArray(translations) ? translations : [translations];
    translations.forEach((translation, i) => {
      message.channel.send(`(${target}) ${translation}`);
    });
}

async function listLanguages(message) {
    let [languages] = await translate.getLanguages();
    languages.forEach((language, i) => {
        message.channel.send(language.name + " (" + language.code + ")");
    });
}

function makeChannels(message) {
    roomStarter = new String(message.author.username)
    channelName = '-study';
    message.guild.channels.create(roomStarter.concat(channelName), { reason: 'Needed a cool new channel' });
    message.guild.channels.create(roomStarter.concat(channelName), {
        type: 'voice',
    });

}

client.on('ready', () => {
    console.log('AnkiBot is connected to the server');
});

client.on("message", async function(message) {
    if(message.author.bot) return; 
    if(!message.content.startsWith(prefix)) return; 

    const d_args = let args = message.content.substring(PREFIX.length).split(" ");
    
    const commandBody = message.content.slice(prefix.length); 

    const tempCommand = commandBody.split(" ", 1);
    const args = commandBody.replace(tempCommand + " ", "");
    const command = tempCommand[0].toLowerCase();

    if (command == "ping"){ 
        const timeTaken = Date.now() - message.createdTimestamp; 
        message.reply(`Daniel's a bitch! This message had a latency of ${timeTaken} ms.`); 
    }

    if (command == "mydecks"){
        const result = await invoke('deckNames', 6);
        message.reply(`These are your current decks: ${result}`);
    }

    if (command == "listcards"){ 
        const result = await invoke('findCards', 6, {"query": `deck:${args}`});
        message.reply(`These are the cards in ${args}: ${result}`);
    }
    
    switch (d_args[0]) {
        case 'play':
            function play(connection, message) {
                var server = servers[message.guild.id];
                if (!server.queue[1]) {
                    server.dispatcher = connection.play(ytdl(server.queue[0], { filter: "audioonly" }));
                    server.dispatcher.on("finish", function() {
                        server.queue.shift();
                        if (server.queue[0]) {
                            play(connection, message);
                        } else {
                            server.queue.push(d_args[1]);
                        }
                    });
                }
            }

            if (!d_args[1]) {
                message.channel.send("Provide a link");
                return;
            }

            if (!message.member.voice.channel) {
                message.channel.send("You must be in a channel to play the bot");
                return;
            }

            if (!servers[message.guild.id]) servers[message.guild.id] = {
                queue: []
            }

            var server = servers[message.guild.id];
            server.queue.push(d_args[1]);

            if (!message.guild.voiceConnection) message.member.voice.channel.join().then(function(connection) {
                play(connection, message);
                })
            break;

        case 'skip':
            var server = servers[message.guild.id];
            if (server.dispatcher) server.dispatcher.end();
            message.channel.send("Skipping song");
            break;

        case 'stop':
            var server = servers[message.guild.id];
            if (message.guild.voice.connection) {
                for (var i = server.queue.length - 1; i >= 0; i--) {
                    server.queue.splice(i, 2);
                }

                server.dispatcher.end();
                message.channel.send("Stopping song");
            }

        case 'study':
            makeChannels(message);
            message.channel.send("Join your study channels");

        case 'languages':
            listLanguages(message);

        case 'translate':
            text = message.content.substring(message.content.indexOf(" ") + 1);
            transArg = d_args[1];
            text = text.substring(text.indexOf(" ") + 1);
            translateText(message, text, transArg);
    }

    if (message.guild.connection) message.guild.voice.connection.disconnect();
}); 

client.login(config.BOT_TOKEN); 
