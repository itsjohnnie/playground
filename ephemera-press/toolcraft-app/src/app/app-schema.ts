import { defineToolcraft } from "@/toolcraft/runtime";

import { appIdentity } from "./app-identity";
import { EPHEMERA_DEFAULTS, EPHEMERA_TARGETS } from "./ephemera/params";

const t = EPHEMERA_TARGETS;
const d = EPHEMERA_DEFAULTS;

const poemOnly = {
  all: [{ equals: "poem", target: t.mode }],
  mode: "conditional",
} as const;
const ringsOnly = {
  all: [{ equals: "rings", target: t.mode }],
  mode: "conditional",
} as const;
const tourOnly = {
  all: [{ equals: "tour", target: t.mode }],
  mode: "conditional",
} as const;
const sheetOnly = {
  all: [{ equals: "sheet", target: t.mode }],
  mode: "conditional",
} as const;
const wheelOnly = {
  all: [{ equals: "wheel", target: t.mode }],
  mode: "conditional",
} as const;
const typewriterRingsOnly = {
  all: [
    { equals: "rings", target: t.mode },
    { equals: "typewriter", target: t.ringStyle },
  ],
  mode: "conditional",
} as const;
const always = { mode: "always" } as const;

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 1350, unit: "px", width: 1080 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  identity: appIdentity,
  panels: {
    controls: {
      sections: [
        {
          controls: {
            background: {
              applicability: always,
              defaultValue: d.background,
              label: false,
              performanceReason:
                "Repainting the flat paper fill is constant-cost work.",
              performanceRole: "responsiveness",
              target: t.background,
              type: "color",
            },
            includeBackground: {
              applicability: always,
              defaultValue: true,
              description:
                "Controls preview and PNG background visibility; when off, PNG exports are transparent.",
              label: "Include",
              performanceReason:
                "Toggling the paper fill swaps one constant-cost rectangle.",
              performanceRole: "responsiveness",
              target: t.includeBackground,
              type: "switch",
            },
          },
          id: "background",
          title: "Background",
        },
        {
          controls: {
            mode: {
              applicability: always,
              defaultValue: d.mode,
              label: "Piece mode",
              options: [
                { label: "Poem", value: "poem" },
                { label: "Rings", value: "rings" },
                { label: "Tour", value: "tour" },
                { label: "Sheet", value: "sheet" },
                { label: "Wheel", value: "wheel" },
              ],
              orderRole: "mode",
              performanceReason:
                "Mode switches between generators without scaling any workload magnitude; sheet cell size and wheel divisions own the magnitudes.",
              performanceRole: "responsiveness",
              target: t.mode,
              type: "tabs",
            },
            seed: {
              applicability: always,
              defaultValue: d.seed,
              description:
                "Deterministic variation: the same seed always sets the same piece.",
              label: "Seed",
              max: 9999,
              min: 1,
              performanceReason:
                "Reseeding recomposes the same piece; it never changes the amount of work.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 1,
              target: t.seed,
              type: "slider",
            },
          },
          id: "piece",
          title: "Piece",
        },
        {
          controls: {
            accent: {
              applicability: always,
              defaultValue: d.accent,
              description:
                "The second ink: dates, line numbers, stitches, and highlights.",
              label: "Accent",
              performanceReason:
                "Recoloring repaints the same display list at constant cost.",
              performanceRole: "responsiveness",
              target: t.accent,
              type: "color",
            },
            ink: {
              applicability: always,
              defaultValue: d.ink,
              label: "Ink",
              performanceReason:
                "Recoloring repaints the same display list at constant cost.",
              performanceRole: "responsiveness",
              target: t.ink,
              type: "color",
            },
          },
          id: "inks",
          title: "Inks",
        },
        {
          controls: {
            arrangement: {
              applicability: poemOnly,
              defaultValue: d.poemArrangement,
              label: "Arrangement",
              options: [
                { label: "Drift", value: "drift" },
                { label: "Rain", value: "rain" },
                { label: "Gaps", value: "gaps" },
                { label: "Constellation", value: "constellation" },
              ],
              performanceReason:
                "Every arrangement sets the same bounded word list; the choice never scales work.",
              performanceRole: "responsiveness",
              target: t.poemArrangement,
              type: "select",
            },
            leading: {
              applicability: poemOnly,
              defaultValue: d.poemLeading,
              label: "Leading",
              max: 2.4,
              min: 1,
              performanceReason:
                "Line spacing moves baselines without changing the word count.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.poemLeading,
              type: "slider",
            },
            scale: {
              applicability: poemOnly,
              defaultValue: d.poemScale,
              label: "Type size",
              max: 1.6,
              min: 0.5,
              performanceReason:
                "Type size rescales glyphs without changing the word count.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.poemScale,
              type: "slider",
            },
            spread: {
              applicability: poemOnly,
              defaultValue: d.poemSpread,
              description:
                "How far words wander from the measure into the margins.",
              label: "Spread",
              max: 1,
              min: 0,
              performanceReason:
                "Spread repositions the same bounded word list at constant cost.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.poemSpread,
              type: "slider",
            },
          },
          id: "verse",
          title: "Verse",
        },
        {
          controls: {
            text: {
              applicability: poemOnly,
              defaultValue: d.poemText,
              description:
                "The poem itself; the engine keeps your line breaks and clamps very long texts.",
              label: "Text",
              performanceReason:
                "Poem text is clamped to a fixed character budget before layout.",
              performanceRole: "responsiveness",
              target: t.poemText,
              textValueKind: "multiline",
              type: "code",
            },
          },
          id: "verse-text",
          title: "Verse Text",
        },
        {
          controls: {
            count: {
              applicability: ringsOnly,
              defaultValue: d.ringCount,
              label: "Count",
              max: 12,
              min: 1,
              performanceReason:
                "Each ring adds one bounded pass of characters or dots; twelve rings stay far below the sheet-cell magnitude.",
              performanceRole: "responsiveness",
              sliderValueKind: "discrete",
              step: 1,
              target: t.ringCount,
              type: "slider",
              variant: "discrete",
            },
            gather: {
              applicability: ringsOnly,
              defaultValue: d.ringGather,
              description:
                "How tightly the rings pull into one another, from a loose rosette to a spirograph knot.",
              label: "Gather",
              max: 1,
              min: 0,
              performanceReason:
                "Gather moves ring centers without changing ring or character counts.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.ringGather,
              type: "slider",
            },
            marks: {
              applicability: ringsOnly,
              defaultValue: d.ringMarks,
              description:
                "Accent stitches at ring crossings and along each ring.",
              label: "Marks",
              performanceReason:
                "Marks add one bounded dot pass over at most twelve rings.",
              performanceRole: "responsiveness",
              target: t.ringMarks,
              type: "switch",
            },
            size: {
              applicability: ringsOnly,
              defaultValue: d.ringSize,
              label: "Size",
              max: 0.9,
              min: 0.2,
              performanceReason:
                "Ring size rescales circles; per-ring character counts stay bounded by the circumference cap.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.ringSize,
              type: "slider",
            },
            style: {
              applicability: ringsOnly,
              defaultValue: d.ringStyle,
              label: "Style",
              options: [
                { label: "Typewriter", value: "typewriter" },
                { label: "Stitched", value: "stitched" },
                { label: "Orbits", value: "orbits" },
              ],
              performanceReason:
                "Every style draws the same bounded ring set; the choice never scales work.",
              performanceRole: "responsiveness",
              target: t.ringStyle,
              type: "select",
            },
            words: {
              applicability: typewriterRingsOnly,
              defaultValue: d.ringWords,
              description:
                "Repeated around each ring, character by character.",
              label: "Words",
              performanceReason:
                "Ring words are clamped to a fixed character budget before layout.",
              performanceRole: "responsiveness",
              target: t.ringWords,
              textValueKind: "single-line",
              type: "text",
            },
          },
          id: "circles",
          title: "Circles",
        },
        {
          controls: {
            artist: {
              applicability: tourOnly,
              defaultValue: d.tourArtist,
              label: "Artist",
              performanceReason:
                "The artist name is one clamped text run at constant cost.",
              performanceRole: "responsiveness",
              target: t.tourArtist,
              textValueKind: "single-line",
              type: "text",
            },
            layout: {
              applicability: tourOnly,
              defaultValue: d.tourLayout,
              label: "Layout",
              options: [
                { label: "Diagonal", value: "diagonal" },
                { label: "Orbit", value: "orbit" },
                { label: "Ledger", value: "ledger" },
              ],
              performanceReason:
                "Every layout sets the same bounded itinerary; the choice never scales work.",
              performanceRole: "responsiveness",
              target: t.tourLayout,
              type: "select",
            },
            leading: {
              applicability: tourOnly,
              defaultValue: d.tourLeading,
              label: "Leading",
              max: 1.8,
              min: 0.8,
              performanceReason:
                "Leading spaces the same bounded itinerary at constant cost.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.tourLeading,
              type: "slider",
            },
          },
          id: "billing",
          title: "Billing",
        },
        {
          controls: {
            dates: {
              applicability: tourOnly,
              defaultValue: d.tourDates,
              description:
                "One show per line: date, city, venue — separated by two spaces or |.",
              label: "Dates",
              performanceReason:
                "The itinerary is clamped to a fixed line budget before layout.",
              performanceRole: "responsiveness",
              target: t.tourDates,
              textValueKind: "multiline",
              type: "code",
            },
          },
          id: "itinerary",
          title: "Itinerary",
        },
        {
          controls: {
            cell: {
              applicability: sheetOnly,
              defaultValue: d.sheetCell,
              description:
                "Grid cell size; smaller cells set and paint more words.",
              label: "Cell size",
              max: 44,
              min: 10,
              performanceReason:
                "Smaller cells quadratically increase the number of set and painted grid slots.",
              performanceRole: "workload",
              sliderValueKind: "continuous",
              step: 1,
              target: t.sheetCell,
              type: "slider",
              unit: "px",
            },
            emphasis: {
              applicability: sheetOnly,
              defaultValue: d.sheetEmphasis,
              description:
                "Fraction of words set heavy or in the accent ink.",
              label: "Emphasis",
              max: 1,
              min: 0,
              performanceReason:
                "Emphasis reweights existing slots without changing their count.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.sheetEmphasis,
              type: "slider",
            },
            pattern: {
              applicability: sheetOnly,
              defaultValue: d.sheetPattern,
              label: "Pattern",
              options: [
                { label: "Weave", value: "weave" },
                { label: "Ledger", value: "ledger" },
                { label: "Patches", value: "patches" },
              ],
              performanceReason:
                "Every pattern fills the same cell grid; cell size owns the magnitude.",
              performanceRole: "responsiveness",
              target: t.sheetPattern,
              type: "select",
            },
            void: {
              applicability: sheetOnly,
              defaultValue: d.sheetVoid,
              description: "Fraction of cells left empty.",
              label: "Void",
              max: 0.9,
              min: 0,
              performanceReason:
                "Void skips slots inside the same grid; the classified grid stays fixed.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.05,
              target: t.sheetVoid,
              type: "slider",
            },
            words: {
              applicability: sheetOnly,
              defaultValue: d.sheetWords,
              description:
                "Repeated to fill the sheet; separate words with spaces.",
              label: "Words",
              performanceReason:
                "Sheet words are clamped to a fixed character budget before layout.",
              performanceRole: "responsiveness",
              target: t.sheetWords,
              textValueKind: "single-line",
              type: "text",
            },
          },
          id: "texture",
          title: "Texture",
        },
        {
          controls: {
            divisions: {
              applicability: wheelOnly,
              defaultValue: d.wheelDivisions,
              description:
                "Scale resolution: ticks, numerals, and rim notches per revolution.",
              label: "Divisions",
              max: 96,
              min: 16,
              performanceReason:
                "Every division adds ticks and numerals to each scale ring.",
              performanceRole: "workload",
              sliderValueKind: "continuous",
              step: 1,
              target: t.wheelDivisions,
              type: "slider",
            },
            instrument: {
              applicability: wheelOnly,
              defaultValue: d.wheelInstrument,
              label: "Face",
              options: [
                { label: "Gauge", value: "gauge" },
                { label: "Knitting", value: "knitting" },
                { label: "Dose", value: "dose" },
                { label: "Dial", value: "dial" },
              ],
              performanceReason:
                "Every instrument draws the same division-bounded scale set; the choice never scales work.",
              performanceRole: "responsiveness",
              target: t.wheelInstrument,
              type: "select",
            },
            notches: {
              applicability: wheelOnly,
              defaultValue: d.wheelNotches,
              description: "Cut notch marks into the outer rim.",
              label: "Notches",
              performanceReason:
                "Notches add one bounded line pass over the divisions already counted.",
              performanceRole: "responsiveness",
              target: t.wheelNotches,
              type: "switch",
            },
            rings: {
              applicability: wheelOnly,
              defaultValue: d.wheelRings,
              label: "Rings",
              max: 6,
              min: 1,
              performanceReason:
                "Each concentric ring adds one bounded scale pass; six rings stay far below the division magnitude.",
              performanceRole: "responsiveness",
              sliderValueKind: "discrete",
              step: 1,
              target: t.wheelRings,
              type: "slider",
              variant: "discrete",
            },
          },
          id: "instrument",
          title: "Instrument",
        },
        {
          controls: {
            imageFormat: {
              applicability: always,
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              performanceReason:
                "The container format does not change rendered export work.",
              performanceRole: "responsiveness",
              target: t.imageFormat,
              type: "select",
            },
            imageResolution: {
              applicability: always,
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              performanceReason:
                "The selected long edge scales exported pixels quadratically during batch export.",
              performanceRole: "workload",
              target: t.imageResolution,
              type: "select",
            },
          },
          id: "image-export",
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
          title: "Image Export",
        },
        {
          actionGroup: "secondary",
          controls: {
            outputActions: {
              actions: [
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  role: "export-image",
                  value: "export.png",
                },
                {
                  icon: "copy",
                  label: "Copy SVG",
                  value: "copy.svg",
                  variant: "outline",
                },
              ],
              applicability: always,
              label: false,
              target: "actions.output",
              type: "panelActions",
            },
          },
          id: "export-actions",
          title: "Export",
        },
      ],
      title: "Controls",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    zoom: true,
  },
});
