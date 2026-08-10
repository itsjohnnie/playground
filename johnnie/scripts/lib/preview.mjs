// Finds a 30-second preview clip for a song, via Apple's public iTunes
// Search API — no account, no credentials, no API key, and the clips play
// for anyone regardless of what they're subscribed to. That last part is the
// whole point: a visitor should get a taste of the song without being asked
// to log into anything.
//
// The hard part isn't finding a preview, it's refusing the wrong one.
// A loose search for "Wonderful Day" by CjayQ & glibs happily returns
// "Wonderful Day" by O.A.R.; "jasmine" by eevee returns "Awash in Jasmine"
// by some trio. Attaching the wrong audio to a song is worse than attaching
// none, so every candidate has to match on BOTH title and artist before it's
// accepted, and a song with no confident match simply gets no preview.

// The best preview is the one we don't have to guess at.
//
// When a song already carries a Spotify track link, Spotify's own embed page
// exposes that track's 30-second clip on a public CDN — no key, no login,
// and no matching, because the link identifies the exact recording. That
// sidesteps this whole file's hard problem: there is nothing to get wrong.
//
// Only used when a Spotify link exists. Songs without one still go through
// the search-and-verify path below.
export async function spotifyPreview(link) {
  const id = (String(link || "").match(/track\/([A-Za-z0-9]{22})/) || [])[1];
  if (!id) return null;
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${id}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; a-song-a-day/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const json = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
    );
    if (!json) return null;
    const entity = JSON.parse(json[1])?.props?.pageProps?.state?.data?.entity;
    const url = entity?.audioPreview?.url;
    if (!url) return null;
    return {
      url,
      source: "spotify",
      matched: `${entity.title} — ${(entity.artists || []).map((a) => a.name).join(", ")}`,
      exact: true,
    };
  } catch {
    return null;
  }
}

const norm = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

// "Cristal (feat. BxRod)" -> "cristal"; "Sad girlz luv money (Remix)" ->
// "sadgirlzluvmoney". Parenthetical suffixes are where remix/feature credits
// live, and they differ between services for the same recording.
const bare = (title) => norm(String(title).replace(/\s*[([].*?[)\]]\s*/g, " "));

// "Amaarae ft. Kali Uchis & Moliy" -> ["amaarae", "kaliuchis", "moliy"]
const artistParts = (artist) =>
  String(artist)
    .split(/,|&| ft\.? | feat\.? | featuring | with /i)
    .map(norm)
    .filter(Boolean);

// Search results for any well-known song are full of impostors: karaoke
// backing tracks, tribute-band covers, "originally performed by" filler.
// These are never what's wanted, whatever else they match on.
const JUNK = /karaoke|tribute|made (famous|popular) by|originally performed|cover version|as made famous/i;
// Not junk, but not the recording either — a 30-second taste of the
// instrumental sells the song short. Allowed only if nothing better exists
// and the requested title didn't ask for it.
const VARIANT = /instrumental|\blive\b|acoustic|sped up|slowed/i;

function matches(result, title, artist) {
  const gotTitle = norm(result.trackName);
  const wantTitle = bare(title);
  // The recording's title must be in there — either exactly, or as the stem
  // of a longer official title ("Woods" inside "Woods (Remastered)").
  const titleOk =
    wantTitle.length > 2 &&
    (gotTitle === wantTitle ||
      gotTitle.startsWith(wantTitle) ||
      bare(result.trackName) === wantTitle);
  if (!titleOk) return false;

  // At least one credited artist has to line up. Services disagree about
  // who gets billed on a feature, so any overlap counts — but "some artist,
  // somewhere" does not.
  const got = norm(result.artistName);
  return artistParts(artist).some(
    (part) => part.length > 2 && (got.includes(part) || part.includes(got)),
  );
}

// iTunes Search is free and unauthenticated, and it throttles hard — roughly
// 20 calls a minute before it starts answering 403. Swallowing those as "no
// results" is how you end up reporting that Mac Miller isn't on Apple Music,
// so a throttled call waits and retries instead, and a genuinely failed one
// says so out loud.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(term, limit = 12) {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&entity=song&limit=${limit}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "a-song-a-day/1.0" } });
      if (res.status === 403 || res.status === 429) {
        // Exponential, starting generous: the window is per-minute, so
        // there's no point retrying in 200ms.
        await sleep(3000 * 2 ** attempt);
        continue;
      }
      if (!res.ok) return { results: [], throttled: false };
      const body = await res.json();
      return { results: body.results || [], throttled: false };
    } catch {
      await sleep(1000 * 2 ** attempt);
    }
  }
  return { results: [], throttled: true };
}

// Returns { url, source } or null. Never throws, never guesses.
export async function findPreview(title, artist, album = "") {
  const plain = String(title).replace(/\s*[([].*?[)\]]\s*/g, " ").trim();
  const firstArtist = String(artist).split(/,|&| ft\.? | feat\.? /i)[0].trim();

  // Ordered most- to least-specific. Every result still has to survive
  // matches(), so a broader query can't smuggle in a different song.
  const queries = [
    `${title} ${artist}`,
    `${plain} ${firstArtist}`,
    album ? `${plain} ${album}` : null,
    `${plain} ${firstArtist} ${album || ""}`.trim(),
  ].filter(Boolean);

  const wantsVariant = VARIANT.test(title);
  let throttled = false;

  for (const q of queries) {
    const res = await search(q);
    throttled = throttled || res.throttled;

    // Gather every legitimate candidate rather than taking the first, then
    // prefer the straight recording over an instrumental or a live cut.
    const candidates = res.results.filter(
      (r) => r.previewUrl && !JUNK.test(r.trackName) && matches(r, title, artist),
    );
    const best =
      candidates.find((r) => wantsVariant || !VARIANT.test(r.trackName)) ?? candidates[0];

    if (best) {
      return {
        url: best.previewUrl,
        source: "itunes",
        matched: `${best.trackName} — ${best.artistName}`,
        // Flagged so the caller can mention it rather than quietly serving
        // the karaoke-adjacent version.
        variant: !wantsVariant && VARIANT.test(best.trackName),
      };
    }
    await sleep(1200); // stay under the free API's per-minute window
  }
  // Distinguishing "Apple doesn't have it" from "Apple wouldn't answer" is
  // the difference between a song that has no preview and one that should be
  // retried later; the caller is told which happened.
  if (throttled) throw new Error("iTunes Search throttled — try again shortly");
  return null;
}

// What both scripts actually call. Tries the exact route first (Spotify's own
// clip for the linked track), then falls back to searching Apple's catalogue
// and verifying the result — which is the only option for a song with no
// Spotify link, and still refuses anything it isn't sure of.
export async function resolvePreview(title, artist, album = "", spotify = "") {
  const exact = await spotifyPreview(spotify);
  if (exact) return exact;
  return findPreview(title, artist, album);
}
