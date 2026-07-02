// One-off script: registers the /joke slash command to the test guild.
//
// Guild-scoped commands appear instantly; global commands can take up to an
// hour to propagate — so we register per-guild for fast testing.
//
// Run with: node src/register.js   (or: npm run register)

import 'dotenv/config';

const { DISCORD_APP_ID, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APP_ID || !DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
  console.error(
    'Missing env: DISCORD_APP_ID, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN must all be set.',
  );
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/guilds/${DISCORD_GUILD_ID}/commands`;

const commands = [
  { name: 'joke', description: 'Get a random joke', type: 1 },
];

const res = await fetch(url, {
  method: 'PUT', // bulk-overwrite: this is the full set of guild commands
  headers: {
    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(commands),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, body);
  process.exit(1);
}

console.log(`Registered guild commands (${res.status}):`);
console.log(body);
