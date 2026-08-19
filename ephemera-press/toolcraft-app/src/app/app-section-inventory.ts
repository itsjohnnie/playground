import type { ToolcraftControlSectionInventoryEntry } from "./acceptance/types";

// Product entries use the same explicit stable section IDs as appSchema.
export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  [
    {
      entity: "Background",
      entityId: "background",
      groupingReason:
        "The background switch and its paper color edit the one artboard background entity consumed into runtime Setup.",
      id: "background",
      targets: ["export.includeBackground", "appearance.background"],
      title: "Background",
    },
    {
      entity: "Piece",
      entityId: "piece",
      groupingReason:
        "Mode and seed pick which piece family is composed and which deterministic variation it takes.",
      id: "piece",
      targets: ["piece.mode", "piece.seed"],
      title: "Piece",
    },
    {
      entity: "Inks",
      entityId: "inks",
      groupingReason:
        "The primary ink and the accent ink are the two-color palette every piece family prints with.",
      id: "inks",
      targets: ["ink.primary", "ink.accent"],
      title: "Inks",
    },
    {
      entity: "Verse setting",
      entityId: "verse",
      groupingReason:
        "Arrangement, spread, leading, and type size are the typesetting decisions that scatter the poem across the sheet.",
      id: "verse",
      targets: [
        "poem.arrangement",
        "poem.spread",
        "poem.leading",
        "poem.scale",
      ],
      title: "Verse",
    },
    {
      entity: "Verse text",
      entityId: "verse-text",
      groupingReason:
        "The poem is the source material the scatter is set from; the multiline editor is its complete editable surface.",
      id: "verse-text",
      targets: ["poem.text"],
      title: "Verse Text",
    },
    {
      entity: "Circle set",
      entityId: "circles",
      groupingReason:
        "Style, words, count, size, gather, and marks shape the one overlapping circle composition.",
      id: "circles",
      targets: [
        "rings.style",
        "rings.words",
        "rings.count",
        "rings.size",
        "rings.gather",
        "rings.marks",
      ],
      title: "Circles",
    },
    {
      entity: "Billing",
      entityId: "billing",
      groupingReason:
        "Artist, layout, and leading are the typesetting decisions that shape the concert bill.",
      id: "billing",
      targets: ["tour.artist", "tour.layout", "tour.leading"],
      title: "Billing",
    },
    {
      entity: "Itinerary",
      entityId: "itinerary",
      groupingReason:
        "The show list is the source material the bill is set from; the multiline editor is its complete editable surface.",
      id: "itinerary",
      targets: ["tour.dates"],
      title: "Itinerary",
    },
    {
      entity: "Texture grid",
      entityId: "texture",
      groupingReason:
        "Words, pattern, cell size, void, and emphasis shape the repeated-word texture grid.",
      id: "texture",
      targets: [
        "sheet.words",
        "sheet.pattern",
        "sheet.cell",
        "sheet.void",
        "sheet.emphasis",
      ],
      title: "Texture",
    },
    {
      entity: "Instrument face",
      entityId: "instrument",
      groupingReason:
        "Face, divisions, rings, and notches shape the printed calculating-instrument face.",
      id: "instrument",
      targets: [
        "wheel.instrument",
        "wheel.divisions",
        "wheel.rings",
        "wheel.notches",
      ],
      title: "Instrument",
    },
    {
      entity: "Image export settings",
      entityId: "image-export",
      groupingReason:
        "Format and resolution configure the runtime-owned image artifact.",
      id: "image-export",
      targets: ["export.image.format", "export.image.resolution"],
      title: "Image Export",
    },
  ];
