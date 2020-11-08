const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 
const client = new Discord.Client();
const prefix = "!"; 
const currentVersion = 6; 
const askAll = "askAll"; 
const askAuthor = "askAuthor";
const askComp = "askComp"; 
const otherCommands = ["answer", "yes", "no"]; 
const helpText = ['!mydecks - Get a list of all the decks you currently have on your Anki account', 
                '!quizall (deck name) - Start a quiz on the specified Anki deck, where everyone on the server can try to answer',
                '!quizme (deck name) - Start a quiz on the specified Anki deck, where only you can try to answer',
                '!quizcontest (deck name) - Start a quiz on the specified Anki deck, where everyone can compete for points until the quiz is ended!',
                ];


function invoke(action, version, params={}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
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

function askRedo(args, askType, author, message, scoreArr){  
    //Filter for message collector to only look for messages with !yes or !no
    let filter; 

    if(askType == askAll){
        filter = m => (m.content.includes('!yes') || m.content.includes('!no')) && !m.author.bot;
    }
    else{
        filter = m => (m.content.includes('!yes') || m.content.includes('!no')) && !m.author.bot && m.author == author;
    }
    collector = message.channel.createMessageCollector(filter, {time: 300000, max: 1}); 

    //If user wants another question, make a call to askQuestion, otherwise exit the call stack 
    collector.on('collect', collected => {
        if(collected.toString().toLowerCase().includes('!yes')){ 
            askQuestion(args, askType, author, message, scoreArr, false); 
        }
        else{ 
            //If the user is exitiing competition mode, list the final scores 
            if(askType == askComp){
                message.channel.send(`Here are the final scores:`); 
                for(i = 0; i < scoreArr.length; i++){ 
                    message.channel.send(`${scoreArr[i][0]} : ${scoreArr[i][1]} points`)
                }
            }
            message.channel.send(`See you on the next quiz! :)`); 
        }
    }); 
}

async function askQuestion(args, askType, author, message, scoreArr = [], firstPass = true){

    //Request all card ID's from specified deck, and get the information of each card 
    const result = await invoke('findCards', currentVersion, {"query": `deck:${args}`});
    const cardsInfo = await invoke('cardsInfo', currentVersion, {"cards": result});

    //Choose a random card from the deck to ask 
    i = Math.floor(Math.random() * cardsInfo.length); 

    //Get question and answer from selected card
    let currentCardQuestion = cardsInfo[i].fields.Front.value;
    //Cut off extra escape characters at end of question returned from AnkiConnect API
    currentCardQuestion = currentCardQuestion.substring(0, currentCardQuestion.length - 6);
    let currentCardAnswer = cardsInfo[i].fields.Back.value;  

    // Filter for the message collector: Make sure users answers have !answer, message does not come from bot
    let filter = m => m.content.includes('!answer') && !m.author.bot; 
    if(askType == askAll){
        filter = m => m.content.includes('!answer') && !m.author.bot;
        message.channel.send(`Alright, I'll quiz you on a random card from the ${args} deck now. Anyone can answer!`);
    }
    //Make sure only user can answer if they entered the 'quizme' command 
    else if(askType == askAuthor) {
        filter = m => m.content.includes('!answer') && !m.author.bot && m.author == author;
        message.channel.send(`Alright, I'll quiz you on a random card from the ${args} deck now. Only ${message.member.user.username} can answer!`);
    }
    //Give an explanation of contest rules when doing a quiz contest =
    else if(askType == askComp){
        filter = m => m.content.includes('!answer') && !m.author.bot;
        if(firstPass){
            message.channel.send(`Quiz competition started by ${message.member.user.username} in the ${args} deck!`);
            message.channel.send(`Have your name added to the leaderboard when you answer your first question correctly!`); 
            message.channel.send(`Competition can be ended after any question by ${message.member.user.username}. Good luck!`); 
        }
    }
    
    //Send question in the chat
    message.channel.send(`Question: ${currentCardQuestion} : !answer (your solution) to submit an answer.`); 

    //Create message collector, determine if the users answer was correct or incorrect (only 1 attempt per question)
    let collector = message.channel.createMessageCollector(filter, {time: 300000, max: 1}); 
    collector.on('collect', m => {
        if(m.toString().toLowerCase().includes(currentCardAnswer)){ 
            m.reply(`Well done! The correct answer was ${currentCardAnswer}`);
            //If in competition mode, either add user to scoreboard if they aren't already on it, 
            //or add to their points otherwise 
            if(askType == askComp){ 
                if (scoreArr == []){ 
                    scoreArr.push([m.member.user.username, 1]); 
                }
                else{
                    let inLeaderboard = false; 
                    for(i = 0; i < scoreArr.length && inLeaderboard == false; i++){ 
                        if(m.member.user.username == scoreArr[i][0]){
                            scoreArr[i][1] += 1; 
                            inLeaderboard = true; 
                        }
                    }
                    if (inLeaderboard == false){
                        scoreArr.push([m.member.user.username, 1]); 
                    }
                } 
            }
        }
        //Prompt user if their answer was incorrect 
        else{ 
            message.reply(`Incorrect! The correct answer was ${currentCardAnswer}`); 
        }
    }); 

    //Ask user if they want another question through call too askRedo()
    collector.on('end', collected => {
        //List current scores if in competition mode
        if(askType == askComp){
            message.channel.send(`Here are the current scores:`); 
            for(i = 0; i < scoreArr.length; i++){ 
                message.channel.send(`${scoreArr[i][0]} : ${scoreArr[i][1]} points`)
            }
        }
        message.channel.send(`Would you like to get another question from the ${args} deck? (!yes or !no)`); 
    });

    askRedo(args, askType, author, message, scoreArr);
}

client.on("message", async function(message) {
    //Only read the message as a command if it has the correct prefix and if it is not send by a bot
    if(message.author.bot) return; 
    if(!message.content.startsWith(prefix)) return; 

    //Seperating the command from the arguments 
  
    const commandBody = message.content.slice(prefix.length); 

    const tempCommand = commandBody.split(" ", 1);
    const args = commandBody.replace(tempCommand + " ", "");
    const command = tempCommand[0].toLowerCase();

    if (command == "ping"){ 
        const timeTaken = Date.now() - message.createdTimestamp; 
        message.reply(`Pong! This message had a latency of ${timeTaken} ms.`); 
    }

    //List out current decks in users anki account 
    else if (command == "mydecks"){
        const result = await invoke('deckNames', currentVersion);
        message.reply(`These are your current decks: ${result}`);
    }

    //Quizall command 
    //Allows user to pick a deck, and asks questions in the deck that anyone on the server can answer
    else if (command == "quizall"){ 
        askQuestion(args, askAll, message.author, message); 
    }

    //Quizme command 
    //Allows user to pick a deck, and asks questions in the deck that only the user can answer 
    else if (command == "quizme"){ 
        askQuestion(args, askAuthor, message.author, message); 
    }

    //Quizcontest command 
    //Allows user to pick a deck, and keep track of the scores of users answering questions
    else if (command == "quizcontest"){ 
        askQuestion(args, askComp, message.author, message); 
    }

    //Help command 
    //Write out a list of commands for users to see the bots functions 
    else if (command == "help"){ 
        for(i = 0; i < helpText.length; i++){
            message.channel.send(helpText[i]); 
        }
    }

    //Inform user if they entered a command that doesn't exist 
    else if (!otherCommands.includes(command)){ 
        message.reply(`You entered an invalid command! Please use !help to get a list of commands.`)
    }

});

//Create a discord client for the bot using private token
client.login(config.BOT_TOKEN); 

