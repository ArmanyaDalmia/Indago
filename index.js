const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 
const client = new Discord.Client();
const prefix = "="; 
const currentVersion = 6; 
const askAll = "askAll"; 
const askAuthor = "askAuthor";

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

async function askRedo(args, askType, author, message){  
    filter = m => m.content.includes('!yes') || m.content.includes('!no') && !m.author.bot;
    collector = message.channel.createMessageCollector(filter, {time: 300000, max: 1}); 

    collector.on('collect', collected => {
        if(collected.toString().toLowerCase().includes('!yes')){ 
            askQuestion(args, askType, author, message); 
        }
        else{ 
            message.reply(`Okay, see you on the next quiz! :)`); 
        }
    }); 
}

async function askQuestion(args, askType, author, message){
    //Request all card ID's from specified deck, and get the information of each card 
    const result = await invoke('findCards', currentVersion, {"query": `deck:${args}`});
    const cardsInfo = await invoke('cardsInfo', currentVersion, {"cards": result});

    //Choose a random card from the deck to ask 
    message.reply(`Alright, I'll quiz you on a random card from the ${args} deck now. Anyone can answer!`);
    i = Math.floor(Math.random() * cardsInfo.length); 
    currentCardQuestion = cardsInfo[i].fields.Front.value;
    currentCardAnswer = cardsInfo[i].fields.Back.value;  
    message.reply(`Question: ${currentCardQuestion}, !answer (your solution) to submit an answer.`); 

    let filter; 
    if(askType == 'askAll'){
        filter = mQuestion => mQuestion.content.includes('!answer') && !mQuestion.author.bot;
    }
    else if(askType == 'askAuthor') {
        filter = mQuestion => mQuestion.content.includes('!answer') && !mQuestion.author.bot && mQuestion.author == author;
    }

    let collector = message.channel.createMessageCollector(filter, {time: 300000, max: 1}); 
    collector.on('collect', collected => {
        if(collected.toString().toLowerCase().includes(currentCardAnswer)){ 
            message.reply(`Well done! The correct answer was ${currentCardAnswer}`);
        }
        else{ 
            message.reply(`Incorrect! The correct answer was ${currentCardAnswer}`); 
        }
    }); 
    collector.on('end', collected => {
        message.channel.send(`Would you like to get another question from the ${args} deck?`); 
    });

    askRedo(args, askType, author, message);
}

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
        const result = await invoke('deckNames', currentVersion);
        message.reply(`These are your current decks: ${result}`);
    }

    //Quizall command 
    //Allows user to pick a deck, and asks questions in the deck that anyone on the server can answer
    if (command == "quizall" || redoQuestion == true){ 
        askQuestion(args, askAll, message.author, message); 
    }
});

client.login(config.BOT_TOKEN); 

