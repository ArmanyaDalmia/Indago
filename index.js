const Discord = require("discord.js"); 
const config = require('./config.json');
const client = new Discord.Client();
const prefix = "!"; 

client.login(config.BOT_TOKEN); 
