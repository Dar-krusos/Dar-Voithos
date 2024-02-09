const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge-remove-exclude')
		.setDescription('Only applies to the current server: removes an exemption of a member from being purged.')
		.addUserOption(option =>
			option.setName('username')
				.setDescription('A server member\'s username.')
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false),
	async execute(interaction) { return },
};