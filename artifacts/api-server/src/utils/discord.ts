const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

export async function sendDiscord(embed: DiscordEmbed): Promise<void> {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Zaix Anime",
        avatar_url: "https://i.imgur.com/0wbFOI5.png",
        embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }],
      }),
    });
  } catch {}
}

export async function notifyNewUser(username: string, email: string): Promise<void> {
  await sendDiscord({
    title: "🎌 New User Registered!",
    description: `A new fan just joined Zaix Anime.`,
    color: 0x39ff14,
    fields: [
      { name: "Username", value: username, inline: true },
      { name: "Email", value: email.replace(/(.{2}).+(@.+)/, "$1***$2"), inline: true },
    ],
    footer: { text: "Zaix Anime Growth Tracker" },
  });
}

export async function notifyFiveStarReview(
  username: string,
  contentType: string,
  contentId: string,
  reviewText: string | null
): Promise<void> {
  await sendDiscord({
    title: "⭐ 5-Star Review Received!",
    description: reviewText ? `"${reviewText.slice(0, 200)}${reviewText.length > 200 ? "..." : ""}"` : "No review text.",
    color: 0xffd700,
    fields: [
      { name: "Reviewer", value: username, inline: true },
      { name: "Content", value: `${contentType} #${contentId}`, inline: true },
    ],
    footer: { text: "Zaix Anime Community" },
  });
}
