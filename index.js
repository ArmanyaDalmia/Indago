const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 

const request = require('request-promise');
const cheerio = require('cheerio');

const client = new Discord.Client();
const prefix = "!"; 


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
    } else if (command == "mydecks"){
        const result = await invoke('deckNames', 6);
        message.reply(`These are your current decks: ${result}`);
    } else if (command == "listcards"){ 
        const result = await invoke('findCards', 6, {"query": `deck:${args}`});
        message.reply(`These are the cards in ${args}: ${result}`);
    } else if (command == "createaccount") {
        message.author.send("Please use the command \"!authorize\" (without the quotations) to enter your email and password separated by a space");
    } else if (command == "authorize") {

        let tempArgs = args;
        const myUsername = tempArgs.split(" ", 1);
        tempArgs = tempArgs.replace(myUsername + " ", "");
        const myPassword = tempArgs

        var options = {
            method: 'POST',
            uri: 'https://ankiweb.net/account/register',
            simple: false,
            form: {
                username: `${myUsername}`,
                username2: `${myUsername}`,
                password: `${myPassword}`
            }
        };

        // var options2 = {
        //     uri: 'https://ankiweb.net/account/terms',
        //     simple: false,
        //     transform: function (body) {
        //         return cheerio.load(body);
        //     }
        // }

        // var options3 = {
        //     method: "POST",
        //     uri: 'https://ankiweb.net/account/terms',
        //     simple: false,
        //     form: {}
        // }
        
        request(options)
            .then(function (body) {
                console.log("Account has been created");
                console.log(body);
                //return request(options2);
            })
            // .then(function ($) {
            //     $('input[type="checkbox"]').prop('checked', true);
            //     console.log($(':checkbox').is(':checked'));
            //     return request(options3);
            // })
            // .then(function (body) {
            //     console.log(body);
            // })
            .catch(function (err) {
                console.error(err);
            });

        message.author.send("Please go to https://ankiweb.net/account/login to complete your account creation.");
        message.author.send("After logging in with your provided credentials, you will be directed to accept the terms and conditions.");
        message.author.send("Lastly, you will have to verify your email address after which you're all setup!");

    }

}); 

client.login(config.BOT_TOKEN); 
