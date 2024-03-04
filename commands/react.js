const { SlashCommandBuilder} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('react')
		.setDescription('Manage this bot\'s reactions on a message.')
		.addSubcommand(subCommand => subCommand
			.setName('add')
			.setDescription('Add a reaction to a message (must be sent in the channel with the message).')
			.addStringOption(option => option
				.setName('message')
				.setDescription('the ID of the message')
				.setRequired(true))
			.addStringOption(option => option
				.setName('reaction')
				.setDescription('an emoji, e.g. :heart:')
				.setRequired(true)))
		.addSubcommand(subCommand => subCommand
			.setName('remove')
			.setDescription('Remove a reaction from a message (must be sent in the channel with the message).')
			.addStringOption(option => option
				.setName('message')
				.setDescription('the ID of the message')
				.setRequired(true))
			.addStringOption(option => option
				.setName('reaction')
				.setDescription('an emoji, e.g. :heart:')
				.setRequired(true))),
	async execute(interaction) { return },
};