const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge-exclude')
		.setDescription('Only applies to the current server: exempts a member from being purged.')
		.addUserOption(option =>
			option.setName('username')
				.setDescription('A server member\'s username.')
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false),
	async execute(interaction) { return },
};