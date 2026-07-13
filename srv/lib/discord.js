/**
 * IMPORTANT REALITY CHECK ABOUT DISCORD:
 * Discord has no API to "invite a specific email address" - invites are
 * just join-links (like discord.gg/abc123) that anyone with the link can use.
 * So the pattern here is: a bot creates a fresh, single-use, time-limited
 * invite link, and WE email that link to the employee. That's the standard
 * way every "access request -> Discord" integration works.
 *
 * To wire this up for real:
 * 1. Go to https://discord.com/developers/applications and create an application.
 * 2. Add a Bot to it, copy the Bot Token -> set env var DISCORD_BOT_TOKEN.
 * 3. Invite the bot to your server with the "Create Instant Invite" permission.
 * 4. Copy the ID of a channel the bot can see -> set env var DISCORD_CHANNEL_ID
 *    (right-click a channel in Discord with Developer Mode on -> Copy Channel ID).
 *
 * Until those env vars are set, this returns a clearly-fake placeholder link
 * so the rest of the workflow (approve -> email) still works end-to-end.
 */

const DISCORD_API = 'https://discord.com/api/v10';

async function createDiscordInvite() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn(
      '[discord] DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID not set - ' +
      'returning a placeholder invite link instead of calling Discord.'
    );
    return 'https://discord.gg/DEMO-PLACEHOLDER';
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      max_uses: 1,      // single-use invite
      unique: true,     // don't reuse an existing invite
      max_age: 604800    // expires in 7 days (seconds)
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API error (${res.status}): ${errText}`);
  }

  const invite = await res.json();
  return `https://discord.gg/${invite.code}`;
}

module.exports = { createDiscordInvite };
