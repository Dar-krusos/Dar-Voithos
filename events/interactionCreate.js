const { Events, time, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { DateTime } = require("luxon");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const purgeTimes = interaction.client.purgeTimes;
		const purgeList = interaction.client.purgeList;
		const purgeExempt = interaction.client.purgeExempt;
		const dbSettings = interaction.client.dbSettings;
		const timezones = interaction.client.timezones;
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		
		if (interaction.isChatInputCommand()) {
			if (interaction.commandName != 'react' && interaction.commandName != 'time')
				await interaction.reply('Working...')
			else
				await interaction.reply({ content: 'Working...', ephemeral: true });

			let subCommandGroup = '';
			let subCommand = '';

			try {
				subCommandGroup = `${interaction.options.getSubcommandGroup()}`
			} catch (error) {
				if (error.code != 'CommandInteractionOptionNoSubcommand') {
					console.log(error);
				}
			}

			try {
				subCommand = `${interaction.options.getSubcommand()}`
			} catch (error) {
				if (error.code != 'CommandInteractionOptionNoSubcommand') {
					console.log(error);
				}
			}
			
			console.log(`${Date(interaction.createdTimestamp)}: Command sent by member:${interaction.user.id}: ${interaction.commandName} ${subCommandGroup} ${subCommand}`);
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
			
			if (interaction.commandName === 'purge' && subCommandGroup === 'confirm') {
				if (subCommand === 'window') {
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
				} else if (subCommandGroup === 'confirm' && window != '') {
					if (subCommand === 'execute') {
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
		
					if (subCommand === 'cancel') {
						const clearTime = await purgeTimes.destroy({ where: { guildID: guildID } });

						if (clearTime) {
							await interaction.editReply(`Purge cancelled.`);
							console.log(`${Date(interaction.createdTimestamp)}: Purge for guild:${guildID} cancelled by member:${interaction.user.id}.`);
						} else
							await interaction.editReply(`Failed to cancel: no purge was active.`);
					}
				} else
					interaction.editReply('No confirmation window set. Please set a length of time (`/purge confirm delay`).');
			} else if (interaction.commandName === 'purge' && subCommandGroup === 'settings') {
				if (subCommand === 'view') {
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

				if (subCommand === 'exclude') {
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
	
				if (subCommand === 'remove-exclude') {
					try {
						const clearExemption = await purgeExempt.destroy({ where: { guildID: guildID, userID: interaction.options.getUser('username').id } });
						await interaction.editReply('Exemption removed.');
						console.log(`${Date(interaction.createdTimestamp)}: Purge exemption removed for member:${interaction.options.getUser('username').id} in guild:${guildID} by member:${interaction.user.id}.`);
					} catch (error) { return };
				}
	
				// // to be added if requested
				// if (subCommand === 'eligibility') {
	
				// }
			}

			if (interaction.commandName === 'react') {
				let message;
				try {
					message = await interaction.channel.messages.fetch(interaction.options.get('message').value);
				} catch (error) {
					if (error.message == 'Unknown Message')
						await interaction.editReply('Could not find that message ID in this channel.');
					return;
				}

				let reaction = interaction.options.get('reaction').value;
				if (subCommand === 'add') {
					if (await message.reactions.resolve(reaction) != null) {
						await interaction.editReply('I\'ve already reacted with that emoji.');
						return;
					}

					try {
						await message.react(reaction);
						await interaction.editReply('Reaction added :)');
					} catch (error) {
						if (error.message === 'Unknown Emoji')
							await interaction.editReply('Unknown reaction.');
						else if (error.message === 'Missing Permissions')
							await interaction.editReply('I have not been given permission to remove reactions (Manage Messages).');
						else
							console.log(error);
						return;
					}
				}
				else if (subCommand === 'remove') {
					try {
						await message.reactions.resolve(reaction).remove();
						await interaction.editReply('Reaction removed.');
					} catch (error) {
						if (error.message === 'Unknown Emoji')
							await interaction.editReply('Unknown reaction.');
						else if (error.message.startsWith('Cannot read properties of null'))
							await interaction.editReply('I have not reacted with that emoji yet.');
						else if (error.message === 'Missing Permissions')
							await interaction.editReply('I have not been given permission to remove reactions (Manage Messages).');
						return;
					}
				}
			}

			if (interaction.commandName === 'time') {
				let month = interaction.options.get('month').value;
				let monthInt;
				if (isNaN(month))
					monthInt = months.indexOf(month) + 1;
				else
					monthInt = month;

				if (monthInt.toString().length == 1)
					monthInt = `0${monthInt}`;

				let day = interaction.options.get('day').value;
				if (day.toString().length == 1)
					day = `0${day}`;

				let timeParsed = interaction.options.get('time').value;
				if (!timeParsed.startsWith("0") && !timeParsed.startsWith("1") && !timeParsed.startsWith("2"))
					timeParsed = `0${timeParsed}`;
				
				let localTime = DateTime.fromISO(
					`${interaction.options.get('year').value}-${monthInt}-${day}T${timeParsed}:00`, { zone: interaction.options.get('timezone').value });
				let date = new Date(localTime.toString());

				if (date != 'Invalid Date') {
					const longDate = time(date, 'f');
					const relativeDate = time(date, 'R');
					await interaction.editReply(`${longDate} (${relativeDate})`);
				}
				else {
					console.log(`${Date(interaction.createdTimestamp)}: Command failed: 'time' with inputs: `
					+ `${interaction.options.get('year').value}, ${interaction.options.get('month').value}, ${interaction.options.get('day').value}`
					+ `, ${interaction.options.get('timezone').value}, ${interaction.options.get('time').value}`);
					await interaction.editReply(`The set of arguments provided were invalid.`);
				}
			}
		} else if (interaction.isAutocomplete()) {
			const focusedOption = interaction.options.getFocused(true);
			let choices;
			let filtered;
			
			if (interaction.commandName === 'time') {
				switch (focusedOption.name) {
					case 'year':
						choices = ['1970', '1971', '1972', '1973', '1974', '1975', '1976', '1977', '1978', '1979', '1980', '1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039', '2040', '2041', '2042', '2043', '2044', '2045', '2046', '2047', '2048', '2049', '2050', '2051', '2052', '2053', '2054', '2055', '2056', '2057', '2058', '2059', '2060', '2061', '2062', '2063', '2064', '2065', '2066', '2067', '2068', '2069', '2070', '2071', '2072', '2073', '2074', '2075', '2076', '2077', '2078', '2079', '2080', '2081', '2082', '2083', '2084', '2085', '2086', '2087', '2088', '2089', '2090', '2091', '2092', '2093', '2094', '2095', '2096', '2097', '2098', '2099', '2100', '2101', '2102', '2103', '2104', '2105', '2106', '2107', '2108', '2109', '2110', '2111', '2112', '2113', '2114', '2115', '2116', '2117', '2118', '2119', '2120', '2121', '2122', '2123', '2124', '2125', '2126', '2127', '2128', '2129', '2130', '2131', '2132', '2133', '2134', '2135', '2136', '2137', '2138', '2139', '2140', '2141', '2142', '2143', '2144', '2145', '2146', '2147', '2148', '2149', '2150', '2151', '2152', '2153', '2154', '2155', '2156', '2157', '2158', '2159', '2160', '2161', '2162', '2163', '2164', '2165', '2166', '2167', '2168', '2169', '2170', '2171', '2172', '2173', '2174', '2175', '2176', '2177', '2178', '2179', '2180', '2181', '2182', '2183', '2184', '2185', '2186', '2187', '2188', '2189', '2190', '2191', '2192', '2193', '2194', '2195', '2196', '2197', '2198', '2199', '2200', '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210', '2211', '2212', '2213', '2214', '2215', '2216', '2217', '2218', '2219', '2220', '2221', '2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229', '2230', '2231', '2232', '2233', '2234', '2235', '2236', '2237', '2238', '2239', '2240', '2241', '2242', '2243', '2244', '2245', '2246', '2247', '2248', '2249', '2250', '2251', '2252', '2253', '2254', '2255', '2256', '2257', '2258', '2259', '2260', '2261', '2262', '2263', '2264', '2265', '2266', '2267', '2268', '2269', '2270', '2271', '2272', '2273', '2274', '2275', '2276', '2277', '2278', '2279', '2280', '2281', '2282', '2283', '2284', '2285', '2286', '2287', '2288', '2289', '2290', '2291', '2292', '2293', '2294', '2295', '2296', '2297', '2298', '2299', '2300', '2301', '2302', '2303', '2304', '2305', '2306', '2307', '2308', '2309', '2310', '2311', '2312', '2313', '2314', '2315', '2316', '2317', '2318', '2319', '2320', '2321', '2322', '2323', '2324', '2325', '2326', '2327', '2328', '2329', '2330', '2331', '2332', '2333', '2334', '2335', '2336', '2337', '2338', '2339', '2340', '2341', '2342', '2343', '2344', '2345', '2346', '2347', '2348', '2349', '2350', '2351', '2352', '2353', '2354', '2355', '2356', '2357', '2358', '2359', '2360', '2361', '2362', '2363', '2364', '2365', '2366', '2367', '2368', '2369', '2370', '2371', '2372', '2373', '2374', '2375', '2376', '2377', '2378', '2379', '2380', '2381', '2382', '2383', '2384', '2385', '2386', '2387', '2388', '2389', '2390', '2391', '2392', '2393', '2394', '2395', '2396', '2397', '2398', '2399', '2400', '2401', '2402', '2403', '2404', '2405', '2406', '2407', '2408', '2409', '2410', '2411', '2412', '2413', '2414', '2415', '2416', '2417', '2418', '2419', '2420', '2421', '2422', '2423', '2424', '2425', '2426', '2427', '2428', '2429', '2430', '2431', '2432', '2433', '2434', '2435', '2436', '2437', '2438', '2439', '2440', '2441', '2442', '2443', '2444', '2445', '2446', '2447', '2448', '2449', '2450', '2451', '2452', '2453', '2454', '2455', '2456', '2457', '2458', '2459', '2460', '2461', '2462', '2463', '2464', '2465', '2466', '2467', '2468', '2469', '2470', '2471', '2472', '2473', '2474', '2475', '2476', '2477', '2478', '2479', '2480', '2481', '2482', '2483', '2484', '2485', '2486', '2487', '2488', '2489', '2490', '2491', '2492', '2493', '2494', '2495', '2496', '2497', '2498', '2499', '2500', '2501', '2502', '2503', '2504', '2505', '2506', '2507', '2508', '2509', '2510', '2511', '2512', '2513', '2514', '2515', '2516', '2517', '2518', '2519', '2520', '2521', '2522', '2523', '2524', '2525', '2526', '2527', '2528', '2529', '2530', '2531', '2532', '2533', '2534', '2535', '2536', '2537', '2538', '2539', '2540', '2541', '2542', '2543', '2544', '2545', '2546', '2547', '2548', '2549', '2550', '2551', '2552', '2553', '2554', '2555', '2556', '2557', '2558', '2559', '2560', '2561', '2562', '2563', '2564', '2565', '2566', '2567', '2568', '2569', '2570', '2571', '2572', '2573', '2574', '2575', '2576', '2577', '2578', '2579', '2580', '2581', '2582', '2583', '2584', '2585', '2586', '2587', '2588', '2589', '2590', '2591', '2592', '2593', '2594', '2595', '2596', '2597', '2598', '2599', '2600', '2601', '2602', '2603', '2604', '2605', '2606', '2607', '2608', '2609', '2610', '2611', '2612', '2613', '2614', '2615', '2616', '2617', '2618', '2619', '2620', '2621', '2622', '2623', '2624', '2625', '2626', '2627', '2628', '2629', '2630', '2631', '2632', '2633', '2634', '2635', '2636', '2637', '2638', '2639', '2640', '2641', '2642', '2643', '2644', '2645', '2646', '2647', '2648', '2649', '2650', '2651', '2652', '2653', '2654', '2655', '2656', '2657', '2658', '2659', '2660', '2661', '2662', '2663', '2664', '2665', '2666', '2667', '2668', '2669', '2670', '2671', '2672', '2673', '2674', '2675', '2676', '2677', '2678', '2679', '2680', '2681', '2682', '2683', '2684', '2685', '2686', '2687', '2688', '2689', '2690', '2691', '2692', '2693', '2694', '2695', '2696', '2697', '2698', '2699', '2700', '2701', '2702', '2703', '2704', '2705', '2706', '2707', '2708', '2709', '2710', '2711', '2712', '2713', '2714', '2715', '2716', '2717', '2718', '2719', '2720', '2721', '2722', '2723', '2724', '2725', '2726', '2727', '2728', '2729', '2730', '2731', '2732', '2733', '2734', '2735', '2736', '2737', '2738', '2739', '2740', '2741', '2742', '2743', '2744', '2745', '2746', '2747', '2748', '2749', '2750', '2751', '2752', '2753', '2754', '2755', '2756', '2757', '2758', '2759', '2760', '2761', '2762', '2763', '2764', '2765', '2766', '2767', '2768', '2769', '2770', '2771', '2772', '2773', '2774', '2775', '2776', '2777', '2778', '2779', '2780', '2781', '2782', '2783', '2784', '2785', '2786', '2787', '2788', '2789', '2790', '2791', '2792', '2793', '2794', '2795', '2796', '2797', '2798', '2799', '2800', '2801', '2802', '2803', '2804', '2805', '2806', '2807', '2808', '2809', '2810', '2811', '2812', '2813', '2814', '2815', '2816', '2817', '2818', '2819', '2820', '2821', '2822', '2823', '2824', '2825', '2826', '2827', '2828', '2829', '2830', '2831', '2832', '2833', '2834', '2835', '2836', '2837', '2838', '2839', '2840', '2841', '2842', '2843', '2844', '2845', '2846', '2847', '2848', '2849', '2850', '2851', '2852', '2853', '2854', '2855', '2856', '2857', '2858', '2859', '2860', '2861', '2862', '2863', '2864', '2865', '2866', '2867', '2868', '2869', '2870', '2871', '2872', '2873', '2874', '2875', '2876', '2877', '2878', '2879', '2880', '2881', '2882', '2883', '2884', '2885', '2886', '2887', '2888', '2889', '2890', '2891', '2892', '2893', '2894', '2895', '2896', '2897', '2898', '2899', '2900', '2901', '2902', '2903', '2904', '2905', '2906', '2907', '2908', '2909', '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2918', '2919', '2920', '2921', '2922', '2923', '2924', '2925', '2926', '2927', '2928', '2929', '2930', '2931', '2932', '2933', '2934', '2935', '2936', '2937', '2938', '2939', '2940', '2941', '2942', '2943', '2944', '2945', '2946', '2947', '2948', '2949', '2950', '2951', '2952', '2953', '2954', '2955', '2956', '2957', '2958', '2959', '2960', '2961', '2962', '2963', '2964', '2965', '2966', '2967', '2968', '2969', '2970', '2971', '2972', '2973', '2974', '2975', '2976', '2977', '2978', '2979', '2980', '2981', '2982', '2983', '2984', '2985', '2986', '2987', '2988', '2989', '2990', '2991', '2992', '2993', '2994', '2995', '2996', '2997', '2998', '2999', '3000'];
						filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
						break;
					case 'month':
						choices = months;
						filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
						break;
					case 'day':
						let year = interaction.options.getInteger('year');
						let month = interaction.options.getString('month');

						if (month === 'January' | month === 'March' | month === 'May' | month === 'July' | month === 'August' | month === 'October' | month === 'December') {
							choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
						} else if (month === 'February') {
							if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)
								choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];
							else
								choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'];
						} else {
							choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'];
						}
						filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
						break;
					case 'timezone':
						// choices = await purgeTimes;
						const timezonePrms = await timezones.findAll();
						choices = timezonePrms.map(tz => tz.name);
						filtered = choices.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()));
				}

				let options = filtered.slice(0, 25);
				await interaction.respond(
					options.map(choice => ({ name: choice, value: choice })),
				);
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
