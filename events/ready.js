const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		const purgeTimes = client.purgeTimes;
		const purgeList = client.purgeList;
		const purgeExempt = client.purgeExempt;
		purgeTimes.sync();
		purgeList.sync();
		purgeExempt.sync();

		console.log(`Logged in as ${client.user.tag}!`);
			
		// purgeTimes.findAll()/*  */
		// .then(purgeTimeEntry => {
		// 	const purgeTimeEntryDate = new Date(purgeTimeEntry.time);
		// });

		// setInterval(async () => {
		// 	if (purgeTimeEntryDate < Date.now()) {
		// 		const removePurge = await purgeTime.destroy({ where: { guildID: interaction.guildId } });
		// 	}
		// }, 60_000);
	},
};