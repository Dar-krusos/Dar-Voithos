const { Events, time, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const purgeTimes = interaction.client.purgeTimes;
		const purgeList = interaction.client.purgeList;
		const purgeExempt = interaction.client.purgeExempt;
		const dbSettings = interaction.client.dbSettings;

		if (interaction.isChatInputCommand()) {
			await interaction.reply('Working...')
			console.log(`${Date(interaction.createdTimestamp)}: Command sent by member:${interaction.user.id}: `
				+ `${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}`);
			guildID = `${interaction.guildId}`;
			let window;

			try {
				const windowCol = await dbSettings.findOne({ where: { guildID: guildID, name: 'Purge confirm window' } });
				window = windowCol.value;
			} catch (error) {
				if (error.name === 'TypeError') {
					window = '';
				} else console.log(error);
			}
			
			if (interaction.commandName === 'purge' && interaction.options.getSubcommandGroup() === 'confirm') {
				if (interaction.options.getSubcommand() === 'window') {
					try {
						const setWindow = await dbSettings.create({
							guildID: guildID,
							name: 'Purge confirm window',
							value: interaction.options.getInteger('time'),});

						console.log(`${Date(interaction.createdTimestamp)}: Purge confirm window for guild:${guildID} set to ${interaction.options.getInteger('time')} by member:${interaction.user.id}.`);
						await interaction.editReply('Window set successfully.');
					} catch (error) {
						if (error.name === 'SequelizeUniqueConstraintError') {
							const setWindow = await dbSettings.update(
								{ value: interaction.options.getInteger('time') },
								{ where: {
									guildID: guildID,
									name: 'Purge confirm window' } },);

							await interaction.editReply('Window set successfully.');
						} else {
							console.log(error);
						}
					}
				} else if (interaction.options.getSubcommandGroup() === 'confirm' && window != '') {
					if (interaction.options.getSubcommand() === 'execute') {
						if (interaction.guild) {
							try {
								// Calculate purge time
								let date = new Date();
								date = new Date(new Date().getTime() + window*60*60*1000);
								const longDate = time(date, 'f');
								const relativeDate = time(date, 'R');
		
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
								const purgeExemptArr = purgeExemption.map(a => a.userID);
								
								try {
									// Send confirmation to all non-exempt members
									for await (let i of purgeListMap) {
										const user = await interaction.client.users.cache.map(col => col).find(user => user.id == i);
										let exempt = 0;
		
										// Check if member (i) is exempt 
										for (let j of purgeExemptArr) {
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
												+ `A server (\`${interaction.guild.name}\`) will purge its members on ${longDate} (${relativeDate}).\n`
												+ 'Would you like to stay or leave?',
												components: [row],
											});
										}
									}
								}
								catch (error) {
									console.log(`${Date(interaction.createdTimestamp)}: \n` + error);
								}
								
								console.log(`${Date(interaction.createdTimestamp)}: Purge initatied for guild:${guildID} by member:${interaction.user.id}`);
								await interaction.editReply(`Now waiting on responses. Purge date: ${longDate} (${relativeDate})`);
							}
							catch (error) {
								if (error.name === 'SequelizeUniqueConstraintError') {
									console.log(`${Date(interaction.createdTimestamp)}: Purge initiation failed by member:${interaction.user.id} - purge already ongoing.`);
									await interaction.editReply('A purge confirmation has already been started.');
								} else console.log(error);
							}
						} else {
							await interaction.editReply('This command was not sent in a server.')
						}
					}
		
					if (interaction.options.getSubcommand() === 'cancel') {
						const clearTime = await purgeTimes.destroy({ where: { guildID: guildID } });
		
						await interaction.editReply(`Purge cancelled.`);
						console.log(`${Date(interaction.createdTimestamp)}: Purge for guild:${guildID} cancelled by member:${interaction.user.id}.`);
					}
				} else
					interaction.editReply('No confirmation window set. Please set a length of time (`/purge confirm delay`).');
			} else if (interaction.commandName === 'purge' && interaction.options.getSubcommandGroup() === 'settings') {
				if (interaction.options.getSubcommand() === 'view') {
					let purgeTimeDates = 'none active';
					let purgeExemptArr;

					// Get purge time and format output
					try {
						const purgeTimeEntry = await purgeTimes.findOne({ where: { guildID: guildID } });
						purgeTimeDateLong = time(new Date(purgeTimeEntry.time), 'f');
						purgeTimeDateAway = time(new Date(purgeTimeEntry.time), 'R');
						purgeTimeDates = `${purgeTimeDateLong} (${purgeTimeDateAway})`
					} catch (error) {
						if (error.name != 'TypeError')
							console.log(error);
					}

					//Get exempt member list
					try {
						const purgeExemptCol = await purgeExempt.findAll({ where: { guildID: guildID } });
						purgeExemptArr = purgeExemptCol.map(u => u.userID).join(', ') || 'none';
					} catch (error) {
						if (error.name != 'TypeError')
							console.log(error);
					}

					const settingsEmbed = new EmbedBuilder()
						.setColor(Math.floor(Math.random()*16777215).toString(16))
						.setTitle('Purge Settings')
						.setDescription(`Purge confirm window (hours): ${window}\n`
						+ `Active purge confirmation: ${purgeTimeDates}`)
						.addFields(
							{ name: '\u200B', value: '\u200B' },
							{ name: 'Members exempt from purging', value: purgeExemptArr });

					interaction.editReply({ content: '', embeds: [settingsEmbed] });
				}

				if (interaction.options.getSubcommand() === 'exclude') {
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
	
				if (interaction.options.getSubcommand() === 'remove-exclude') {
					try {
						const clearExemption = await purgeExempt.destroy({ where: { guildID: guildID, userID: interaction.options.getUser('username').id } });
						await interaction.editReply('Exemption removed.');
						console.log(`${Date(interaction.createdTimestamp)}: Purge exemption removed for member:${interaction.options.getUser('username').id} in guild:${guildID} by member:${interaction.user.id}.`);
					} catch (error) { return };
				}
	
				// // to be added if requested
				// if (interaction.options.getSubcommand() === 'eligibility') {
	
				// }
			}
		} else if (interaction.isButton()) {
			console.log(`${Date(interaction.createdTimestamp)}: Button:${interaction.customId} sent by member:${interaction.user.id}`);

			guildID = interaction.customId.substring(interaction.customId.indexOf('-')+1);
			date = new Date().getTime();
			
			// Get purge time
			const purgeTimeEntry = await purgeTimes.findOne({ where: { guildID: guildID } });
			const purgeTimeEntryDate = new Date(purgeTimeEntry.time).getTime();

			if (date < purgeTimeEntryDate) {
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