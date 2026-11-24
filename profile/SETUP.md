# Pixel Room profile — setup

An isometric pixel-art room for your GitHub profile README, drawn from your own stats.
Three themes are generated: `pixel-room-day.svg` (sunny), `pixel-room-night.svg` (blue night) and
`pixel-room-purple.svg` (purple neon night: LED strip, string lights, neon heart, city view, black cat).
The README shows the day room in light mode and the purple room in dark mode — swap the file names to change that.

| Room item | Driven by |
| --- | --- |
| Books on the shelf | One per repository (most-starred first), colored by language |
| Poster on the wall | Contribution heatmap, last 13 weeks |
| Monitor code | Your top language's color |
| Trophy | Shows once you have stars, gold at 100+ |
| Plant | Grows with followers |
| `LV` | Based on contributions this year |

Animated: blinking cursor, steaming mug, swishing cat tail, twinkling stars and lamp glow at night.

## Dev scene GIF

`generate-dev.mjs` renders `dist/dev-scene.gif` (960×540, 48 frames, ~400 KB): someone in a purple hoodie and
headphones coding late at night — moonlight through window blinds, a glowing CRT where code types itself out,
a ticking clock, blinking PC LEDs, steaming coffee and a sleeping cat. Your stats run along the bottom.
It uses its own GIF encoder, so there is still nothing to install.

## Install

1. Create a public repo named exactly like your username (`<username>/<username>`) — GitHub shows its README on your profile.
2. Copy everything in this `profile/` folder to the **root** of that repo:
   `generate-room.mjs`, `generate-dev.mjs`, `lib.mjs`, `README.md`, `.github/workflows/pixel-room.yml`, `dist/`.
3. In that repo: **Settings → Actions → General → Workflow permissions → Read and write**.
4. **Actions → Pixel Room → Run workflow**. It refreshes every 6 hours after that.

## Run locally

```bash
node generate-room.mjs --user <username> --out dist          # real data (set GITHUB_TOKEN for the heatmap)
node generate-room.mjs --user <username> --out dist --demo   # sample data, no network
node generate-dev.mjs  --user <username> --out dist --demo   # dev scene GIF
```

No dependencies — Node 18+ only.
