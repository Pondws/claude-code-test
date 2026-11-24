# Pixel Room profile — setup

An isometric pixel-art room for your GitHub profile README, drawn from your own stats.
Light mode shows a sunny room; dark mode shows the same room at night.

| Room item | Driven by |
| --- | --- |
| Books on the shelf | One per repository (most-starred first), colored by language |
| Poster on the wall | Contribution heatmap, last 13 weeks |
| Monitor code | Your top language's color |
| Trophy | Shows once you have stars, gold at 100+ |
| Plant | Grows with followers |
| `LV` | Based on contributions this year |

Animated: blinking cursor, steaming mug, swishing cat tail, twinkling stars and lamp glow at night.

## Install

1. Create a public repo named exactly like your username (`pondws/pondws`) — GitHub shows its README on your profile.
2. Copy everything in this `profile/` folder to the **root** of that repo:
   `generate-room.mjs`, `README.md`, `.github/workflows/pixel-room.yml`, `dist/`.
3. In that repo: **Settings → Actions → General → Workflow permissions → Read and write**.
4. **Actions → Pixel Room → Run workflow**. It refreshes every 6 hours after that.

## Run locally

```bash
node generate-room.mjs --user pondws --out dist          # real data (set GITHUB_TOKEN for the heatmap)
node generate-room.mjs --user pondws --out dist --demo   # sample data, no network
```

No dependencies — Node 18+ only.
