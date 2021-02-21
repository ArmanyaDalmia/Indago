const Schedule = require("./scheduleClass.js");
const Discord = require("discord.js");
//const config = require("./config.json");

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const request = require("request-promise");
const tough = require("tough-cookie");

const ytdl = require("ytdl-core");
const { Translate } = require("@google-cloud/translate").v2;
const translate = new Translate();

const client = new Discord.Client();
const prefix = "!";
const scheduleArr = [];
const currentVersion = 6;
const askAll = "askAll";
const askAuthor = "askAuthor";
const askComp = "askComp";
const otherCommands = ["answer", "yes", "no"];
const helpText = [
  "!mydecks - Get a list of all the decks you currently have on your Anki account",
  "!quizall (deck name) - Start a quiz on the specified Anki deck, where everyone on the server can try to answer",
  "!quizme (deck name) - Start a quiz on the specified Anki deck, where only you can try to answer",
  "!quizcontest (deck name) - Start a quiz on the specified Anki deck, where everyone can compete for points until the quiz is ended!",
  "!play (youtube-url) - Plays audio stream from this youtube link, also puts songs in queue",
  "!skip - Skips current song",
  "!stop - Stops audio",
  "!study - Creates new text and voice channel for user",
  "!languages - Shows list of available languages to translate",
  "!translate (language, text) - Translates text to desired language",
  "!ListCards (deck ID) - List IDs of cards in specified deck",
  "!CreateDeck (name) - Creates deck with specified name",
  "!sync - Syncs your Anki account with the Anki problem on your computer",
  "!MentalHealh - List of mental health resources",
  "!math (expression) - Solves simple math expressions",
  "!CreateSchedule (Schedule Name) - Creates a schedule that can be held and defines it with a name, that the user can add to.",
  "!FillSchedule (name, task 1, task 2, etc...) given a name, fills in tasks that must be done in the list.",
  "!RetrieveSchedule (name) -given a name, will display all the tasks listed within the schedule that the user can see and be reminded of.",
  "!DisplayMySchedules - displays all the schedules that the user has so they can pick which one to view",
  "!DeleteSchedule (name) - given a name, completely wipes a schedule once it is no longer of use",
  "!VerifyAccount - sends private message prompting user to use !login",
  "!CreateAccount - sends private message prompting user to use !newuser",
  "!NewUser (email, password) - Create a new user through AnkiWeb, requires user to go to website to accept terms and conditions and verify email",
  "!login (email, password) - Use command to log into AnkiWeb account",
];
const querystring = require("querystring");
const fetch = require("node-fetch");

var servers = {};

function invoke(action, version, params = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () => reject("failed to issue request"));
    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw "response has an unexpected number of fields";
        }
        if (!response.hasOwnProperty("error")) {
          throw "response is missing required error field";
        }
        if (!response.hasOwnProperty("result")) {
          throw "response is missing required result field";
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open("POST", "http://127.0.0.1:8765");
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

//Translates text to target language
async function translateText(message, text, tar) {
  const toText = text;
  const target = tar;

  let [translations] = await translate.translate(toText, target);
  translations = Array.isArray(translations) ? translations : [translations];
  translations.forEach((translation, i) => {
    message.channel.send(`(${target}) ${translation}`);
  });
}

//List all available languages for translation
async function listLanguages(message) {
  let [languages] = await translate.getLanguages();
  languages.forEach((language, i) => {
    message.channel.send(language.name + " (" + language.code + ")");
  });
}

//Creates new text and voice channels for user
function makeChannels(message) {
  roomStarter = new String(message.author.username);
  channelName = "-study";
  message.guild.channels.create(roomStarter.concat(channelName), {
    reason: "Needed a cool new channel",
  });
  message.guild.channels.create(roomStarter.concat(channelName), {
    type: "voice",
  });
}

function askRedo(args, askType, author, message, scoreArr) {
  //Filter for message collector to only look for messages with !yes or !no
  let filter;

  if (askType == askAll) {
    filter = (m) =>
      (m.content.includes("!yes") || m.content.includes("!no")) &&
      !m.author.bot;
  } else {
    filter = (m) =>
      (m.content.includes("!yes") || m.content.includes("!no")) &&
      !m.author.bot &&
      m.author == author;
  }
  collector = message.channel.createMessageCollector(filter, {
    time: 300000,
    max: 1,
  });

  //If user wants another question, make a call to askQuestion, otherwise exit the call stack
  collector.on("collect", (collected) => {
    if (collected.toString().toLowerCase().includes("!yes")) {
      askQuestion(args, askType, author, message, scoreArr, false);
    } else {
      //If the user is exitiing competition mode, list the final scores
      if (askType == askComp) {
        message.channel.send(`Here are the final scores:`);
        for (i = 0; i < scoreArr.length; i++) {
          message.channel.send(`${scoreArr[i][0]} : ${scoreArr[i][1]} points`);
        }
      }
      message.channel.send(`See you on the next quiz! :)`);
    }
  });
}

async function askQuestion(
  args,
  askType,
  author,
  message,
  scoreArr = [],
  firstPass = true
) {
  //Request all card ID's from specified deck, and get the information of each card
  const result = await invoke("findCards", currentVersion, {
    query: `deck:${args}`,
  });
  const cardsInfo = await invoke("cardsInfo", currentVersion, {
    cards: result,
  });

  //Choose a random card from the deck to ask
  i = Math.floor(Math.random() * cardsInfo.length);

  //Get question and answer from selected card
  let currentCardQuestion = cardsInfo[i].fields.Front.value;
  //Cut off extra escape characters at end of question returned from AnkiConnect API
  currentCardQuestion = currentCardQuestion.substring(
    0,
    currentCardQuestion.length - 6
  );
  let currentCardAnswer = cardsInfo[i].fields.Back.value;

  // Filter for the message collector: Make sure users answers have !answer, message does not come from bot
  let filter = (m) => m.content.includes("!answer") && !m.author.bot;
  if (askType == askAll) {
    filter = (m) => m.content.includes("!answer") && !m.author.bot;
    message.channel.send(
      `Alright, I'll quiz you on a random card from the ${args} deck now. Anyone can answer!`
    );
  }
  //Make sure only user can answer if they entered the 'quizme' command
  else if (askType == askAuthor) {
    filter = (m) =>
      m.content.includes("!answer") && !m.author.bot && m.author == author;
    message.channel.send(
      `Alright, I'll quiz you on a random card from the ${args} deck now. Only ${message.member.user.username} can answer!`
    );
  }
  //Give an explanation of contest rules when doing a quiz contest =
  else if (askType == askComp) {
    filter = (m) => m.content.includes("!answer") && !m.author.bot;
    if (firstPass) {
      message.channel.send(
        `Quiz competition started by ${message.member.user.username} in the ${args} deck!`
      );
      message.channel.send(
        `Have your name added to the leaderboard when you answer your first question correctly!`
      );
      message.channel.send(
        `Competition can be ended after any question by ${message.member.user.username}. Good luck!`
      );
    }
  }

  //Send question in the chat
  message.channel.send(
    `Question: ${currentCardQuestion} : !answer (your solution) to submit an answer.`
  );

  //Create message collector, determine if the users answer was correct or incorrect (only 1 attempt per question)
  let collector = message.channel.createMessageCollector(filter, {
    time: 300000,
    max: 1,
  });
  collector.on("collect", (m) => {
    if (m.toString().toLowerCase().includes(currentCardAnswer)) {
      m.reply(`Well done! The correct answer was ${currentCardAnswer}`);
      //If in competition mode, either add user to scoreboard if they aren't already on it,
      //or add to their points otherwise
      if (askType == askComp) {
        if (scoreArr == []) {
          scoreArr.push([m.member.user.username, 1]);
        } else {
          let inLeaderboard = false;
          for (i = 0; i < scoreArr.length && inLeaderboard == false; i++) {
            if (m.member.user.username == scoreArr[i][0]) {
              scoreArr[i][1] += 1;
              inLeaderboard = true;
            }
          }
          if (inLeaderboard == false) {
            scoreArr.push([m.member.user.username, 1]);
          }
        }
      }
    }
    //Prompt user if their answer was incorrect
    else {
      message.reply(`Incorrect! The correct answer was ${currentCardAnswer}`);
    }
  });

  //Ask user if they want another question through call too askRedo()
  collector.on("end", (collected) => {
    //List current scores if in competition mode
    if (askType == askComp) {
      message.channel.send(`Here are the current scores:`);
      for (i = 0; i < scoreArr.length; i++) {
        message.channel.send(`${scoreArr[i][0]} : ${scoreArr[i][1]} points`);
      }
    }
    message.channel.send(
      `Would you like to get another question from the ${args} deck? (!yes or !no)`
    );
  });

  askRedo(args, askType, author, message, scoreArr);
}

function existChecker(listName) {
  let exist = false;
  for (i = 0; i < scheduleArr.length; i++) {
    if (scheduleArr[i].name == listName) {
      exist = true;
    }
  }
  return exist;
}

client.on("message", async function (message) {
  //Only read the message as a command if it has the correct prefix and if it is not send by a bot
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const d_args = message.content.substring(prefix.length).split(" ");

  //Seperating the command from the arguments
  const commandBody = message.content.slice(prefix.length);

  const tempCommand = commandBody.split(" ", 1);
  const args = commandBody.replace(tempCommand + " ", "");
  const command = tempCommand[0].toLowerCase();

  //Daily Planner/Scheduling function section
  if (command === "createschedule") {
    //Allows user to create a schedule
    let name = args;
    if (existChecker(name)) {
      message.reply(
        "The schedule you named already exist, you may add to it instead or choose to make a new one!"
      );
    } else {
      var schedule = new Schedule(name);
      scheduleArr.push(schedule);
      message.reply(
        `Your new schedule ${name} has been successfully created, tasks may now be added`
      );
    }
  } else if (command === "fillschedule") {
    //Allows user to fill schedule with tasks
    let nameOfList = args.split(" ", 1);
    let chores = args.replace(nameOfList + " ", "");
    let tasks = chores.split(" ");

    if (existChecker(nameOfList)) {
      //checks input validity

      for (i = 0; i < scheduleArr.length; i++) {
        //cycles schedule array
        if (scheduleArr[i].name == nameOfList) {
          for (j = 0; j < tasks.length; j++) {
            scheduleArr[i][j] = tasks[j];
          }
          message.channel.send(
            "Your new tasks have been uploaded, I'll remember em for ya!"
          );
        }
      }
    } else {
      message.reply(
        `Sorry the schedule you requested does not exist, display if needed to find the correct list name`
      );
    }
  } else if (command === "retrieveschedule") {
    //Allows user to check a schedule given a name
    let nameOfList = args.split(" ", 1);

    if (existChecker(nameOfList)) {
      message.reply("your schedule is as follows:");
      for (i = 0; i < scheduleArr.length; i++) {
        if (scheduleArr[i].name == nameOfList) {
          let size = Object.keys(scheduleArr[i]).length;
          for (j = 0; j < size; j++) {
            message.channel.send(scheduleArr[i][j]);
          }
        }
      }
    } else {
      message.reply(
        `Sorry the schedule you requested does not exist, display if needed to find the correct list name`
      );
    }
  } else if (command === "displaymyschedules") {
    //Allows user to check a schedule given a name
    //verifies if there are any schedules
    if (scheduleArr.length == 0) {
      message.reply(
        "It appears as though you don't have any schedules, make some and we'll keep track of them for you!"
      );
    } else {
      message.reply("These are all your schedules");
      for (i = 0; i < scheduleArr.length; i++) {
        message.channel.send();
        message.channel.send(i + 1 + ". \t" + scheduleArr[i].name);
      }
    }
  } else if (command === "deleteschedule") {
    //Allows user to delete a schedule given a name
    let deleteName = args;
    let counter = 0;
    //checks for the existence of said schedule and deletes the element at the index
    for (i = 0; i < scheduleArr.length; i++) {
      if (scheduleArr[i].name == deleteName) {
        scheduleArr.splice(i, 1);
        counter++;
      }
    }
    if (counter == 0) {
      message.reply(
        "Sorry the schedule you requested does not exist, display if needed to find the correct list name"
      );
    } else {
      message.reply(deleteName + " has been deleted from your schedules!");
    }
  } else if (command == "verifyaccount") {
    message.author.send(
      'Please use the command "!login" (without the quotations) to enter your email and password separated by a space'
    );
  } else if (command == "createaccount") {
    message.author.send(
      'Please use the command "!newUser" (without the quotations) to enter your email and password separated by a space'
    );
  } else if (command == "newuser") {
    let tempArgs = args;
    const myUsername = tempArgs.split(" ", 1);
    tempArgs = tempArgs.replace(myUsername + " ", "");
    const myPassword = tempArgs;

    let cookie = new tough.Cookie({
      key: "New User Key",
      value: "Random Value",
      domain: "ankiweb.net",
      secure: true,
      httpOnly: true,
      maxAge: 31536000,
    });

    var cookiejar = request.jar();
    cookiejar.setCookie(cookie, "https://ankiweb.net");

    var options = {
      method: "POST",
      uri: "https://ankiweb.net/account/register",
      jar: cookiejar,
      simple: false,
      form: {
        username: `${myUsername}`,
        username2: `${myUsername}`,
        password: `${myPassword}`,
      },
    };

    request(options)
      .then(function (body) {
        console.log("Account has been created");
        console.log(body);
      })
      .catch(function (err) {
        console.error(err);
      });

    message.author.send(
      "Please go to https://ankiweb.net/account/login to complete your account creation."
    );
    message.author.send(
      "After logging in with your provided credentials, you will be directed to accept the terms and conditions."
    );
    message.author.send(
      "Lastly, you will have to verify your email address after which you're all setup!"
    );
  } else if (command == "login") {
    let tempArgs = args;
    const myUsername = tempArgs.split(" ", 1);
    tempArgs = tempArgs.replace(myUsername + " ", "");
    const myPassword = tempArgs;

    let cookie = new tough.Cookie({
      key: "New User Key",
      value: "Random Value",
      domain: "ankiweb.net",
      secure: true,
      httpOnly: true,
      maxAge: 31536000,
    });

    var cookiejar = request.jar();
    cookiejar.setCookie(cookie, "https://ankiweb.net");

    var options = {
      method: "POST",
      uri: "https://ankiweb.net/account/login",
      jar: cookiejar,
      simple: false,
      form: {
        username: `${myUsername}`,
        password: `${myPassword}`,
      },
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

    setInterval(function () {
      sec--;
      if (sec == 00) {
        minute--;
        sec = 60;

        if (minute == 0) {
          if (count == 4) {
            message.reply(
              `Congrats! You have finished your 4th pomodoro! Take a longer, 25 minute break. You've earned it.`
            );
            count = 0;
          } else {
            message.reply(
              `Congrats! You have finished ${count} out of 4 pomodoros! Take a 5 minute break. You've earned it.`
            );
            rest = true;
          }

          minute = !rest ? 25 : 5;
          count++;
        }
      }
    }, 1000);
  }

  //List out current decks in users anki account
  else if (command == "mydecks") {
    const result = await invoke("deckNames", currentVersion);
    message.reply(`These are your current decks: ${result}`);
  }

  //Quizall command
  //Allows user to pick a deck, and asks questions in the deck that anyone on the server can answer
  else if (command == "quizall") {
    askQuestion(args, askAll, message.author, message);
  }

  //Quizme command
  //Allows user to pick a deck, and asks questions in the deck that only the user can answer
  else if (command == "quizme") {
    askQuestion(args, askAuthor, message.author, message);
  }

  //Quizcontest command
  //Allows user to pick a deck, and keep track of the scores of users answering questions
  else if (command == "quizcontest") {
    askQuestion(args, askComp, message.author, message);
  }

  //Help command
  //Write out a list of commands for users to see the bots functions
  else if (command == "help") {
    for (i = 0; i < helpText.length; i++) {
      message.channel.send(helpText[i]);
    }
  }

  //ListCards command
  //List IDs of cards in specified deck
  else if (command == "listcards") {
    const result = await invoke("findCards", 6, { query: `deck:${args}` });
    message.reply(`These are the cards in ${args}: ${result}`);
  }

  //CreateDeck command
  //Creates deck with specified name
  else if (command == "createdeck") {
    const result = await invoke("createDeck", 6, { deck: `${args[0]}` });
    message.reply(`Created deck: ${args[0]}`);
  }

  //sync command
  //Syncs your Anki account with the Anki problem on your computer
  else if (command == "sync") {
    const result = await invoke("sync", 6);
    message.reply(`Local Anki collection has been synced with AnkiWeb`);
  }

  //mentalhealth command
  //List of mental health resources
  else if (command == "mentalhealth") {
    message.reply(
      `List of Mental health resources you can access right now: https://docs.google.com/document/d/1B-rprKuuVvR8QQxq5yjTC_rgswjdzz2uUgRZbMnrnsQ/edit?usp=sharing`
    );
  }

  //math.js api
  //Solves simple math expressions
  else if (command == "math") {
    const maf = await fetch(
      `http://api.mathjs.org/v4/?expr=${encodeURIComponent(args)}`
    ).then((response) => response.text());
    message.channel.send(maf);
  }

  //Inform user if they entered a command that doesn't exist
  else if (!otherCommands.includes(command)) {
    message.reply(
      `You entered an invalid command! Please use !help to get a list of commands.`
    );
  }

  switch (d_args[0]) {
    case "play":
      function play(connection, message) {
        var server = servers[message.guild.id];
        if (!server.queue[1]) {
          server.dispatcher = connection.play(
            ytdl(server.queue[0], { filter: "audioonly" })
          );
          server.dispatcher.on("finish", function () {
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

      if (!servers[message.guild.id])
        servers[message.guild.id] = {
          queue: [],
        };

      var server = servers[message.guild.id];
      server.queue.push(d_args[1]);

      if (!message.guild.voiceConnection)
        message.member.voice.channel.join().then(function (connection) {
          play(connection, message);
        });
      break;

    case "skip":
      var server = servers[message.guild.id];
      if (server.dispatcher) server.dispatcher.end();
      message.channel.send("Skipping song");
      break;

    case "stop":
      var server = servers[message.guild.id];
      if (message.guild.voice.connection) {
        for (var i = server.queue.length - 1; i >= 0; i--) {
          server.queue.splice(i, 2);
        }

        server.dispatcher.end();
        message.channel.send("Stopping song");
      }
      break;

    case "study":
      makeChannels(message);
      message.channel.send("Join your study channels");
      break;

    case "languages":
      listLanguages(message);
      break;

    case "translate":
      text = message.content.substring(message.content.indexOf(" ") + 1);
      transArg = d_args[1];
      text = text.substring(text.indexOf(" ") + 1);
      translateText(message, text, transArg);
      break;
  }
  if (message.guild.connection) message.guild.voice.connection.disconnect();
});

//Create a discord client for the bot using private token
//client.login(config.BOT_TOKEN);
client.login(process.env.BOT_TOKEN);

const express = require("express");
const app = express();

// set the port of our application
// process.env.PORT lets the port be set by Heroku
const port = process.env.PORT || 5000;

// set the view engine to ejs
app.set("view engine", "ejs");

// make express look in the `public` directory for assets (css/js/img)
app.use(express.static(__dirname + "/public"));

// set the home page route
app.get("/", (request, response) => {
  // ejs render automatically looks in the views folder
  response.render("pages/home");
});

// set the about page route
app.get("/about", (request, response) => {
  // ejs render automatically looks in the views folder
  response.render("pages/about");
});

app.listen(port, () => {
  // will echo 'Our app is running on http://localhost:5000 when run locally'
  console.log("Our app is running on http://localhost:" + port);
});

// pings server every 15 minutes to prevent dynos from sleeping
setInterval(() => {
  http.get("http://indago-discord.herokuapp.com");
}, 900000);
