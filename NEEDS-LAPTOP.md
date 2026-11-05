# Needs the laptop (tabled for tomorrow)

Data that needs Basketball Reference scraping through the browser (shell and WebFetch cannot reach it):

1. Real player stats and rosters for 1947-48, 1948-49 and 1949-50 (the game currently generates these seasons from the 1946-47 rosters).
   Then build ratings like the other years and add a step that swaps real rosters in at the start of those seasons for games that began in 1946.
2. Real 1950-51 rosters swapped into a game that began in 1946 (raw stats already in tools/data-1950; no injection step yet).
3. Real champions, records and playoff results for 1947-48 through 1950-51 to check the generated seasons against.
4. Contract and salary history before 1990 (approximate now).
5. Historic coach ratings (approximate now).
6. Contract-length inference (59% accurate).
7. Anything sourced from bbref season pages for the events and rules audit (task 74, 75).

Portraits: not sourced by me. 1,696 players still have none, listed in MISSING-PORTRAITS.md.

8. 2025-26 opening-night rosters, audited through transactions (data/players-2025-open.json). Every team is at 15, and the doubles and wrong-team players found so far are fixed (v423). What is left: for each of the 30 teams, take the real opening-night 15 (Oct 21-22, 2025) from the 2024-25 end roster plus the July-October 2025 transactions, then confirm each player against his 2025-26 game log. Sources that work in a browser: RealGM team Transaction-History pages and Basketball Reference game logs. The shell and WebFetch only reach some of those pages, and RealGM's league summaries contradict its team pages (for example, which side Hunter Tyson was traded from on Feb 5, 2026).
   Known to check first: Nets (Cam Thomas, Highsmith, Tyrese Martin, Jalen Wilson), Pacers, Clippers (Paul and Beal), Knicks, Bulls, Hornets, Jazz.
