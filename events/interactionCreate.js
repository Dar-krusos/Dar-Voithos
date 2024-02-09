const { Events, time, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const purgeTimes = interaction.client.purgeTimes;
		const purgeList = interaction.client.purgeList;
		const purgeExempt = interaction.client.purgeExempt;

		if (interaction.isChatInputCommand()) {
			console.log(`${Date(interaction.createdTimestamp)}: ${interaction.commandName} sent by member:${interaction.user.id}`);
			guildID = `${interaction.guildId}`;

			if (interaction.commandName === 'purge-confirm') {
				await interaction.reply('Working...')
				
				if (interaction.guild) {
					try {
						// Calculate purge time
						date = new Date();
						date = new Date(date.setDate(date.getDate() + 3));
						const longDate = time(date, 'f');
						const relative = time(date, 'R');

						// Set purge time
						const purgeTimeCreate = await purgeTimes.create({
							guildID: guildID,
							time: date,
						});

						// Clear purge list for current guild
						const resetList = await purgeList.destroy({ where: { guildID: guildID } });

						// Push all guild members to purge list
						const allMembers = await interaction.guild.members.fetch();
						for await (let data of allMembers.filter(member => !member.user.bot).map(member => member.id)) {
							const purgeListEntry = await purgeList.create({
								guildID: guildID,
								userID: data,
							});
						}

						// Construct arrays for all members and exempt members
						const purgeListPurge = await purgeList.findAll({ where: { guildID: guildID, response: 0 } });
						const purgeListMap = purgeListPurge.map(a => a.userID);

						const purgeExemption = await purgeExempt.findAll({ where: { guildID: guildID } });
						const purgeExemptionMap = purgeExemption.map(a => a.userID);
						
						try {
							// Send confirmation to all non-exempt members
							for await (let i of purgeListMap) {
								const user = await interaction.client.users.cache.map(col => col).find(user => user.id == i);
								let exempt = 0;

								// Check if member (i) is exempt 
								for (let j of purgeExemptionMap) {
									if (user == j) exempt = 1;
								}
								
								if (exempt == 0) {
									const stay = new ButtonBuilder()
										.setCustomId(`stay-${interaction.guildId}`)
										.setLabel('Stay')
										.setStyle(ButtonStyle.Success);

									const leave = new ButtonBuilder()
										.setCustomId(`leave-${interaction.guildId}`)
										.setLabel('Leave')
										.setStyle(ButtonStyle.Danger);

									const row = new ActionRowBuilder()
										.addComponents(stay, leave);

									user.send({
										content: '__**URGENT NOTICE: YOU MAY BE KICKED**__\n'
										+ `A server (\`${interaction.guild.name}\`) will purge its members on ${longDate} (${relative}).\n`
										+ 'Would you like to stay or leave?',
										components: [row],
									});
								}
							}
						}
						catch (error) {
							console.log(`${Date(interaction.createdTimestamp)}: \n` + error);
						}

						setInterval(async () => {
							try {
								if (date.getTime() < Date.now()) {
									const removePurge = await purgeTime.destroy({ where: { guildID: guildID } });
	
									for await (let i of purgeListMap) {
										const member = await interaction.guild.members.fetch(i);
										let exempt = 0;

										// Check if member (i) is exempt 
										for (let j of purgeExemptionMap) {
											if (member == j) exempt = 1;
										}
										
										if (exempt == 0) {
											try {
												await member.kick('Purge.');
												await member.send(`You have been kicked from \`${interaction.guild.name}\` due to a server purge.`);
												console.log(`${Date(interaction.createdTimestamp)}: Purge - kicked member:${interaction.user.id} from guild:${guildID}.`);
											} catch (error) {
												console.log(`${Date(interaction.createdTimestamp)}: Purge - failed to kick member:${member.id}.`);
											}
										}
									}
								}
							} catch (error) { console.log(`${Date(interaction.createdTimestamp)}: Timer already cleared.`); }
						}, 60_000);

						await interaction.editReply(`Now waiting on responses. Purge date: ${longDate} (${relative})`);
					}
					catch (error) {
						if (error.name === 'SequelizeUniqueConstraintError') {
							console.log(`${Date(interaction.createdTimestamp)}: Purge initiation failed by member:${interaction.user.id} - purge already ongoing.`);
							await interaction.editReply('A purge confirmation has already been started.');
						}
					}
				} else {
					await interaction.editReply('This command was not sent in a server.')
				}
			}

			if (interaction.commandName === 'purge-exclude') {
				await interaction.reply('Working...')

				try {
					const purgeExemption = await purgeExempt.create({
						guildID: guildID,
						userID: interaction.options.getUser('username').id,
					});

					await interaction.editReply('Exemption added.');
					console.log(`${Date(interaction.createdTimestamp)}: Purge exemption created for `
					+ `member:${interaction.options.getUser('username').id} in guild:${guildID} by member:${interaction.user.id}.`);
				} catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						await interaction.editReply('That user is already exempt.');
					} else {
						console.log(`${Date(interaction.createdTimestamp)}: Attempt to create purge exemption for member:${interaction.options.getUser('username').id} `
						+ `in guild:${guildID} by member:${interaction.user.id} - unable to write to file.`);
						await interaction.editReply('Oops. Something went wrong.');
					}
				}
			}

			if (interaction.commandName === 'purge-remove-exclude') {
				await interaction.reply('Working...')

				try {
					const clearExemption = await purgeExempt.destroy({ where: { guildID: guildID, userID: interaction.options.getUser('username').id } });
					await interaction.editReply('Exemption removed.');
					console.log(`${Date(interaction.createdTimestamp)}: Purge exemption removed for member:${interaction.options.getUser('username').id} in guild:${guildID} by member:${interaction.user.id}.`);
				} catch (error) { return };
			}

			if (interaction.commandName === 'purge-cancel') {
				await interaction.reply('Working...')
				
				const clearTime = await purgeTimes.destroy({ where: { guildID: guildID } });

				await interaction.editReply(`Purge cancelled.`);
				console.log(`${Date(interaction.createdTimestamp)}: Purge for guild:${guildID} cancelled by member:${interaction.user.id}.`);
			}
		} else if (interaction.isButton()) {
			console.log(`${Date(interaction.createdTimestamp)}: button ${interaction.customId} sent by member:${interaction.user.id}`);

			guildID = interaction.customId.substring(interaction.customId.indexOf('-')+1);
			date = new Date();
			
			// Get purge time
			const purgeTimeEntry = await purgeTimes.findOne({ where: { guildID: guildID } });
			const purgeTimeEntryDate = new Date(purgeTimeEntry.time);

			if (date.getTime() < purgeTimeEntryDate.getTime()) {
				response = interaction.customId.substring(0,interaction.customId.indexOf('-'));

				if (response === 'stay') {
					const updateResponse = await purgeList.update({ response: 1 }, { where: { guildID: guildID, userID: interaction.user.id } });
					await interaction.update({ content: 'Thank you for your response. You chose to stay.', components: []});
				} else {
					await interaction.update({ content: 'Thank you for your response. You chose to leave.', components: []});
					const guild = await interaction.client.guilds.fetch(guildID);
					try {
						const member = await guild.members.fetch((interaction.user.id));
						await member.kick('Purge/left.');
						await member.send(`You have been kicked from \`${guild.name}\` due to a server purge.`);
						console.log(`${Date(interaction.createdTimestamp)}: Purge - member:${interaction.user.id} left guild:${guildID}.`);
					}
					catch (error) {
						console.log(`${Date(interaction.createdTimestamp)}: Purge - failed to kick member:${interaction.user.id} from guild:${guildID}.`);
						await interaction.followUp('I could not kick you. Please manually leave the server if you still want to leave.');
					}
				}
			} else
				await interaction.update({ content: "This prompt has expired.", components: []});
		}
	},
};