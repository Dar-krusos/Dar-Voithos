const { token } = require('./config.json');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');

// Create client instance
const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	]
});

// Initialise slash commands
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// Database initialise
const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

// Database - purge list time
const purgeTimes = sequelize.define('Purge Times', {
	guildID: {
		type: Sequelize.STRING,
		unique: true,
	},
	time: Sequelize.INTEGER,
});

// Database - purge list table
const purgeList = sequelize.define('Purge List', {
	guildID: Sequelize.STRING,
	userID: Sequelize.STRING,
	response: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
},
{
    indexes: [
        {
            unique: true,
            fields: ['guildID', 'userID']
        }
    ]
});

// Database - purge exemption table
const purgeExempt = sequelize.define('Purge Exclusion List', {
	guildID: Sequelize.STRING,
	userID: Sequelize.STRING,
},
{
    indexes: [
        {
            unique: true,
            fields: ['guildID', 'userID']
        }
    ]
});

client.purgeTimes = purgeTimes;
client.purgeList = purgeList;
client.purgeExempt = purgeExempt;

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);