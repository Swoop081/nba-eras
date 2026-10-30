# Assets

Add your own images here from a laptop. Nothing in this folder is required to run the game.

- `nba-logo.png`: the logo shown on the main menu. A transparent PNG, taller than wide, works best. If it is missing, the game shows a plain "NBA" wordmark instead.
- `players/` (or `photos/`): player portraits. Name each file after the player in lower case with hyphens, for example `joe-fulks.jpg`. The name must match the player's id in `data/players-1946.json`. `.png` and `.webp` also work. Players without a photo show their initials. With the era filter on, photos appear in black and white.
- `icon-192.png`, `icon-512.png`, `icon-180.png`: the home screen icon. Replace them with your own if you like.
- `logos/`: team logos. Name a file after the team id in `data/teams-1946.json`, for example `chicago-stags.png` or `.svg`. For a logo that belongs to one era only, add the era: `chicago-stags-1946.png`. The era version is used first. Teams without a logo show a coloured badge with initials. With the era filter on, logos appear in black and white.
