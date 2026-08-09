---
name: add-song
description: Add a song to A Song a Day® (johnnies.life/songs). Use whenever Johnnie says he loves a song, wants a song added to the playlist page, mentions a track he's been listening to and wants it up, or asks to change/remove a song already on the page. Handles the Spotify link, the 30-second preview clip, the artist photo, the accent colour and the commit.
---

# Add a song to A Song a Day®

Johnnie says *"I love this song"* and it ends up on johnnies.life/songs. That
sentence is the whole interface — everything below is your job, not his.

## What a song needs

Each song is one markdown file in `johnnie/content/songs/`. The fields:

| Field | Who fills it | Notes |
|-------|--------------|-------|
| `order` | script | Next number in the run. Highest shows first. |
| `title`, `artist` | you | From what Johnnie said. |
| `album` | you | Look it up if he didn't say. |
| `date` | script | Today, unless told otherwise. |
| `spotify` | **you — find it** | The track's `open.spotify.com/track/…` URL. |
| `preview` | script | 30-second clip, looked up on Apple's public API. |
| `image` | **you — ask** | A photo of the artist. See below. |
| `credit` | you | Where the photo came from. |
| `color` | script | Sampled from the photo. |
| `note` | optional | Replaces the automatic "a song by X…" line. |

## The routine

1. **Work out what the song is.** If Johnnie was vague ("that Frank Ocean one
   with the pyramids"), figure it out and confirm the title/artist back to him
   in one line — don't interrogate him.

2. **Find the Spotify track URL.** Web-search `<title> <artist> spotify track`
   or fetch `https://open.spotify.com/search/…`. You want the canonical
   `https://open.spotify.com/track/<22-char-id>` form. Verify the id is 22
   characters and that the title matches — a wrong link is worse than none.

3. **Get a photo.** This is the one thing you must not invent. The images on
   this site are hand-picked photographs of the *artists* — not album covers —
   and Johnnie chooses them. Ask:

   > Got a photo you want to use for this one? Drop a path or a URL — otherwise
   > I'll add the song without one and you can pick later in /admin/.

   Never substitute the album cover to "fill the gap". A song with no photo is
   fine; the wrong image is not. If he gives you one, ask where it's from and
   pass it as `--credit` (see *Photo rights* below).

4. **Run the script** from `johnnie/`:

   ```bash
   node scripts/add-song.mjs "Woods" "Mac Miller" \
     --album "Circles" \
     --spotify "https://open.spotify.com/track/3Qa944OTMZkg8DHjET8JQv" \
     --image ~/Desktop/mac.jpg \
     --credit "Photo: Ryan Muir"
   ```

   Add `--dry-run` first if anything looks uncertain. The script refuses
   duplicates, picks the next number, resolves the preview clip, imports and
   resizes the photo, and samples the accent colour.

5. **Read what it printed.** It reports what it couldn't find. If there's no
   preview clip, say so plainly — that song will show a "Play on Spotify"
   button instead of playing in the page. Don't paper over it.

6. **Build, then ship.**

   ```bash
   npm run build          # from johnnie/ — catches a bad colour or slug clash
   ```

   Then commit and push on a branch. Johnnie has standing authority for this
   section: commit → push → PR → squash-merge, without asking.

## Photo rights

Johnnie has said he isn't sure he has rights to all the existing photos —
most were found via image search. That's his call to make, not yours to
police, but two things follow for anything **new** you add:

- Always record where the photo came from in `--credit`. It shows on the page
  and it means a takedown request is a two-minute fix rather than an
  archaeology project.
- If he asks you to source a photo yourself, prefer something with a clear
  licence — the artist's own press kit, their label's press page, Wikimedia
  Commons, or Unsplash — and name it in the credit.

Don't lecture him about this. Record the source and move on.

## Editing or removing a song

Everything is a markdown file, so editing is direct:

- **Change something** — edit `johnnie/content/songs/<n>-<slug>.md`, or use
  `/admin/` on the live site (the "A Song a Day" collection).
- **Re-run the preview lookup** for songs missing a clip:
  `node scripts/find-previews.mjs` (only touches songs with an empty
  `preview`; `--all` re-checks everything).
- **Remove a song** — delete its markdown file and its image in
  `johnnie/public/songs/`. Don't renumber the others; gaps in `order` are
  harmless, and renumbering would change every URL after it.

## Things that will bite you

- **`order` drives everything** — the sort, the prev/next arrows, the number
  on the page. Never reuse one.
- **Slugs are permanent.** The URL comes from the title unless the file
  carries an explicit `slug`. Changing a title changes the URL; if the song
  has been shared, add a `slug` field with the old value instead.
- **The accent colour is only half the story.** The page picks black or white
  text automatically based on contrast, so a dark photo gives a dark page with
  light text. That's working as intended — don't "fix" it by lightening the
  colour.
- **iTunes throttles.** Roughly 20 lookups a minute. The script backs off and
  tells you if it gave up; rerun in a minute rather than assuming the song
  isn't there.
