// Stateless HTTP-interactions Discord bot.
//
// Two jobs, no persistent gateway connection:
//   POST /interactions  - Discord sends slash commands (and a validation PING) here.
//   POST /cron          - an external scheduler hits this to trigger a scheduled post.
//
// Because we only ever *send* messages and *respond* to commands, we never need a
// WebSocket. The whole thing is one HTTP service that can scale to zero.

import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from 'discord-interactions';
import { getRandomJoke } from './jokes.js';
import { postMessage } from './discord.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- health check ----------------------------------------------------------
app.get('/', (_req, res) => res.status(200).send('ok'));

// --- interactions ----------------------------------------------------------
// Signature verification needs the EXACT raw bytes Discord signed, so we must
// NOT let express JSON-parse the body first. express.raw() hands us a Buffer;
// we verify against it, then parse it ourselves.
app.post(
  '/interactions',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValid =
      signature &&
      timestamp &&
      (await verifyKey(
        req.body, // raw Buffer
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY,
      ));

    if (!isValid) {
      return res.status(401).send('invalid request signature');
    }

    const interaction = JSON.parse(req.body.toString('utf8'));

    // Discord pings the endpoint to verify it; we MUST answer with PONG.
    if (interaction.type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    if (
      interaction.type === InteractionType.APPLICATION_COMMAND &&
      interaction.data?.name === 'joke'
    ) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: getRandomJoke() },
      });
    }

    return res.status(400).send('unhandled interaction');
  },
);

// --- scheduled post trigger ------------------------------------------------
// Stands in for Cloud Scheduler OIDC auth: a shared bearer secret. The schedule
// itself lives outside the bot (cron / Cloud Scheduler) — this just exposes the
// trigger. JSON parser applies only here (interactions handles its own body).
app.post('/cron', express.json(), async (req, res) => {
  const provided =
    req.get('Authorization')?.replace(/^Bearer\s+/i, '') || req.query.key;

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    await postMessage(process.env.DISCORD_CHANNEL_ID, getRandomJoke());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('cron post failed:', err);
    return res.status(502).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`discord-joke-bot listening on :${PORT}`);
});
