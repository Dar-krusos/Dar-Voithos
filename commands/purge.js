const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Kick inactive members.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false)
		.addSubcommandGroup(subGroup => subGroup
			.setName('confirm')
			.setDescription('Confirm with target members before purging.')
			.addSubcommand(subCommand => subCommand
				.setName('execute')
				.setDescription('Perform purge confirmation. Members who do not reply will also be purged.'))
			.addSubcommand(subCommand => subCommand
				.setName('cancel')
				.setDescription('Cancel purge.'))
			.addSubcommand(subCommand => subCommand
				.setName('window')
				.setDescription('Set the length of time between when confirmations are sent and purging starts.')
				.addIntegerOption(option => option
					.setName('time')
					.setDescription('Length of window in hours.')
					.setRequired(true))))
		.addSubcommandGroup(subGroup => subGroup
			.setName('settings')
			.setDescription('Purge settings.')
			.addSubcommand(subCommand => subCommand
				.setName('view')
				.setDescription('View purge settings.'))
			.addSubcommand(subCommand => subCommand
				.setName('exclude')
				.setDescription('Exempt a member from being purged.')
				.addUserOption(option => option
					.setName('username')
					.setDescription('A member\'s username.')
					.setRequired(true)))
			.addSubcommand(subCommand => subCommand
				.setName('remove-exclude')
				.setDescription('Remove an exemption of a member from being purged.')
				.addUserOption(option => option
					.setName('username')
					.setDescription('A member\'s username.')
					.setRequired(true)))
			/* .addSubcommand(subCommand => subCommand
				.setName('eligibility')
				.setDescription('The amount of time a member must be inactive for in order to qualify for purge.')
				.addIntegerOption(option => option
					.setName('time')
					.setDescription('Length of inactivity in hours.')
					.setRequired(true))) */),
	async execute(interaction) { return },
};
