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

}); 

client.login(config.BOT_TOKEN); 
