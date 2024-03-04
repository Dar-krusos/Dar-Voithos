const { SlashCommandBuilder} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('time')
		.setDescription('Get relative timestamp.')
		.addIntegerOption(option => option
			.setName('year')
			.setDescription('as a numeral')
			.setAutocomplete(true)
			.setRequired(true))
		.addStringOption(option => option
			.setName('month')
			.setDescription('alphabetical name or numeral')
			.setAutocomplete(true)
			.setRequired(true))
		.addIntegerOption(option => option
			.setName('day')
			.setDescription('as a numeral')
			.setAutocomplete(true)
			.setRequired(true))
		.addStringOption(option => option
			.setName('timezone')
			.setDescription('from which to convert (e.g. your timezone)')
			.setAutocomplete(true)
			.setRequired(true))
		.addStringOption(option => option
			.setName('time')
			.setDescription('in 24-hour format: hh:mm')
			.setRequired(true)),
	async execute(interaction) { return },
};