const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 
const client = new Discord.Client();
const prefix = "!"; 
const querystring = require('querystring');
const fetch = require("node-fetch");

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

client.on("message", async function(message) {
    if(message.author.bot) return; 
    if(!message.content.startsWith(prefix)) return; 
    const commandBody = message.content.slice(prefix.length); 
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
	//ankiconnect commands
    if (command == "mydecks"){
        const result = await invoke('deckNames', 6);
        message.reply(`These are your current decks: ${result}`);
    }
    if (command == "listcards"){ 
        const result = await invoke('findCards', 6, {"query": `deck:${args}`});
        message.reply(`These are the cards in ${args}: ${result}`);
    }
	if (command == "createdeck"){
		const result = await invoke('createDeck', 6, {deck: `${args[0]}`});
		message.reply(`Created deck: ${args[0]}`);
	}
	if (command == "sync"){
		const result = await invoke('sync', 6);
		message.reply(`Local Anki collection has been synced with AnkiWeb`);
	}
	if (command == "mentalhealth"){
		message.reply(`List of Mental health resources you can access right now: https://docs.google.com/document/d/1B-rprKuuVvR8QQxq5yjTC_rgswjdzz2uUgRZbMnrnsQ/edit?usp=sharing`);
	} 
	//math.js api 
    if (command == 'math') {
    const maf = await fetch(`http://api.mathjs.org/v4/?expr=${encodeURIComponent(args)}`).then(response => response.text());
	message.channel.send(maf);
   }

}); 

client.login(config.BOT_TOKEN); 