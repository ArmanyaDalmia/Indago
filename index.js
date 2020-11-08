const Schedule = require('./scheduleClass.js');
const Discord = require("discord.js"); 
const config = require('./config.json');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; 
const client = new Discord.Client();
const prefix = "!"; 
const scheduleArr = [];

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

client.on("message", async function(message) {
    if(message.author.bot||!message.content.startsWith(prefix)) {
        return;
    }

    const commandBody = message.content.slice(prefix.length); 

    const tempCommand = commandBody.split(" ", 1);
    const args = commandBody.replace(tempCommand + " ", "");
    const command = tempCommand[0].toLowerCase();
    
    //Daily Planner/Scheduling function section
    if (command === "createschedule") {//Allows user to create a schedule
        let name = args;
        if(existChecker(name)){
            message.reply("The schedule you named already exist, you may add to it instead or choose to make a new one!");
        }else{
            var schedule = new Schedule (name);
            scheduleArr.push(schedule);
            message.reply(`Your new schedule ${name} has been successfully created, tasks may now be added`);
        }


    }else if (command === "fillschedule"){//Allows user to fill schedule with tasks
        let nameOfList = args.split (" ", 1);
        let chores = args.replace (nameOfList + " ", "");
        let tasks = chores.split (" ");
    
        if(existChecker(nameOfList)){ //checks input validity
            
            for(i = 0; i < scheduleArr.length; i++){ //cycles schedule array
                if(scheduleArr[i].name == nameOfList){
                    for(j = 0; j < tasks.length; j++){
                        scheduleArr[i][j] = tasks[j]; 
                    }
                    message.channel.send("Your new tasks have been uploaded, I'll remember em for ya!");
                }
            }
        }else{
            message.reply(`Sorry the schedule you requested does not exist, display if needed to find the correct list name`);
        }


    }else if (command === "retrieveschedule") {//Allows user to check a schedule given a name
        let nameOfList = args.split (" ", 1);
        
        if (existChecker(nameOfList)){
            message.reply("your schedule is as follows:");
            for(i = 0; i < scheduleArr.length; i++){
                if(scheduleArr[i].name == nameOfList){ 
                    let size = Object.keys(scheduleArr[i]).length; 
                    for(j = 0; j < size; j++){
                        message.channel.send(scheduleArr[i][j]);
                    }
                }
            }    
        }else{
            message.reply(`Sorry the schedule you requested does not exist, display if needed to find the correct list name`);
        }
    }else if (command === "displaymyschedules") {//Allows user to check a schedule given a name
        //verifies if there are any schedules
        if(scheduleArr.length == 0){
            message.reply("It appears as though you don't have any schedules, make some and we'll keep track of them for you!");
        }else{
            message.reply("These are all your schedules");
            for (i = 0; i < scheduleArr.length; i++){
                message.channel.send()
                message.channel.send((i + 1) + ". \t" + scheduleArr[i].name);
            }
        }

    }else if (command === "deleteschedule") {//Allows user to delete a schedule given a name
        let deleteName = args;
        let counter = 0;
        //checks for the existence of said schedule and deletes the element at the index
        for(i = 0; i < scheduleArr.length; i++){
            if(scheduleArr[i].name == deleteName){
                scheduleArr.splice(i, 1);
                counter++;
            }
        }
        if(counter == 0){
            message.reply("Sorry the schedule you requested does not exist, display if needed to find the correct list name");
        }else{
            message.reply(deleteName + " has been deleted from your schedules!");
        }

    }
}); 

function existChecker(listName){
    let exist = false;
    for(i = 0; i < scheduleArr.length; i++){
        if(scheduleArr[i].name == listName){
            exist = true;
        }
    }
    return exist;
}

client.login(config.BOT_TOKEN); 
