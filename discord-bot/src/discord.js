// Thin REST helper for the bits of Discord's HTTP API we actually use.
const API = 'https://discord.com/api/v10';

export async function postMessage(channelId, content) {
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
  return res.json();
}
