const { Events, time } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Logged in as ${client.user.tag}!`);

		const purgeTimes = client.purgeTimes;
		const purgeList = client.purgeList;
		const purgeExempt = client.purgeExempt;
		const dbSettings = client.dbSettings;
		purgeTimes.sync();
		purgeList.sync();
		purgeExempt.sync();
		dbSettings.sync();
	
		setInterval(async () => {
			// Check all active purge timers
			const purgeTimesCol = await purgeTimes.findAll();
			const purgeTimesIDs = purgeTimesCol.map(t => t.guildID);
			const purgeTimesArr = purgeTimesCol.map(t => new Date(t.time).getTime());
			
			for (let purgeTime of purgeTimesArr) {
				if (Date.now() > purgeTime) { // Expired purge timer found
					// Get guildID from matching index of expired time
					let index = purgeTimesArr.indexOf(purgeTime);
					let guildID = purgeTimesIDs[index];
					console.log(`${new Date}: PURGE TIME (guild:${guildID})`);

					try {
						// Get all members of guild
						const purgeListCol = await purgeList.findAll({ where: { guildID: guildID } });
						const purgeListArr = purgeListCol.map(u => u.userID);

						// Get all exempt members for guild
						const purgeExemptCol = await purgeExempt.findAll({ where: { guildID: guildID } });
						const purgeExemptArr = purgeExemptCol.map(u => u.userID);

						for await (let i of purgeListArr) {
							// Get member info from userID (i)
							const guild = await client.guilds.fetch(guildID);
							const member = await guild.members.fetch(i);

							// Check if member (i) is exempt
							let exempt = 0;
							for (let j of purgeExemptArr) {
								if (member == j) exempt = 1;
							}
							
							if (exempt == 0) {
								try {
									await member.kick('Purge.');
									await member.send(`You have been kicked from \`${guild.name}\` due to a server purge.`);
									console.log(`${new Date}: Purge - kicked member:${userID} from guild:${guildID}.`);
								} catch (error) {
									console.log(`${new Date}: Purge - failed to kick member:${member.id}.`);
								}
							}
						}

						// Clear purge list timer and for guild
						const removePurgeTime = await purgeTimes.destroy({ where: { guildID: guildID } });
						const removePurgeList = await purgeList.destroy({ where: { guildID: guildID } });
					} catch (error) {
						console.log(`${new Date}: Timer already cleared.`);
					}
				}
			}
		}, 60_000);
	},
};