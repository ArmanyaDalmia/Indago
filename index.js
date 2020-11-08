const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 

const request = require('request-promise');
//const cheerio = require('cheerio');
const tough = require('tough-cookie');

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
    } else if (command == "verifyaccount") {
        message.author.send("Please use the command \"!login\" (without the quotations) to enter your email and password separated by a space");
    } else if (command == "createaccount") {
        message.author.send("Please use the command \"!newUser\" (without the quotations) to enter your email and password separated by a space");
    } else if (command == "newuser") {

        let tempArgs = args;
        const myUsername = tempArgs.split(" ", 1);
        tempArgs = tempArgs.replace(myUsername + " ", "");
        const myPassword = tempArgs

        let cookie = new tough.Cookie({
            key: "New User Key",
            value: "Random Value",
            domain: 'ankiweb.net',
            secure: true,
            httpOnly: true,
            maxAge: 31536000
        });

        var cookiejar = request.jar();
        cookiejar.setCookie(cookie, 'https://ankiweb.net');

        var options = {
            method: 'POST',
            uri: 'https://ankiweb.net/account/register',
            jar: cookiejar,
            simple: false,
            form: {
                username: `${myUsername}`,
                username2: `${myUsername}`,
                password: `${myPassword}`
            }
        };
        
        request(options)
            .then(function (body) {
                console.log("Account has been created");
                console.log(body);
            })
            .catch(function (err) {
                console.error(err);
            });

        message.author.send("Please go to https://ankiweb.net/account/login to complete your account creation.");
        message.author.send("After logging in with your provided credentials, you will be directed to accept the terms and conditions.");
        message.author.send("Lastly, you will have to verify your email address after which you're all setup!");

    } else if (command == "login") {

        let tempArgs = args;
        const myUsername = tempArgs.split(" ", 1);
        tempArgs = tempArgs.replace(myUsername + " ", "");
        const myPassword = tempArgs

        let cookie = new tough.Cookie({
            key: "New User Key",
            value: "Random Value",
            domain: 'ankiweb.net',
            secure: true,
            httpOnly: true,
            maxAge: 31536000
        });

        var cookiejar = request.jar();
        cookiejar.setCookie(cookie, 'https://ankiweb.net');

        var options = {
            method: 'POST',
            uri: 'https://ankiweb.net/account/login',
            jar: cookiejar,
            simple: false,
            form: {
                username: `${myUsername}`,
                password: `${myPassword}`
            }
        };

        request(options)
            .then(function (body) {
                console.log("You have successfully logged in");
                console.log(body);
            })
            .catch(function (err) {
                console.error(err);
            });

        message.author.send("You have successfully logged in!");

    } else if (command == "pomodoro") {

        let count = 1;
        let rest = false;
        let minute = 25;
        let sec = 60;
        
        setInterval(function() {

          sec--;
          if (sec == 00) {

            minute --;
            sec = 60;

            if (minute == 0) {

                if (count == 4) {
                    message.reply(`Congrats! You have finished your 4th pomodoro! Take a longer, 25 minute break. You've earned it.`);   
                    count = 0;
                } else {
                    message.reply(`Congrats! You have finished ${count} out of 4 pomodoros! Take a 5 minute break. You've earned it.`);
                    rest = true;
                }

                minute = !rest ? 25 : 5;
                count++;
            }

          }

        }, 1000);

    }

}); 

client.login(config.BOT_TOKEN); 
