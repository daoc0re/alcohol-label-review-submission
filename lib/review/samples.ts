import type { Application } from "./types";
const base: Application = {
  reference: "DEMO-001",
  beverage: "spirits",
  brand: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  abv: "45",
  netContents: "750 mL",
  business: "Bottled by Old Tom Distillery, Frankfort, KY",
  imported: false,
  origin: "",
};
export const SAMPLES: {
  id: string;
  label: string;
  files: string[];
  application: Application;
}[] = [
  {
    id: "old-tom",
    label: "Old Tom · matching text",
    files: ["old-tom.png"],
    application: base,
  },
  {
    id: "mismatch",
    label: "Old Tom · discrepancies",
    files: ["mismatch.png"],
    application: { ...base, reference: "DEMO-002" },
  },
  {
    id: "stones",
    label: "Stone’s Throw · capitalization",
    files: ["stones-front.png", "stones-back.png"],
    application: {
      ...base,
      reference: "DEMO-003",
      brand: "Stone’s Throw",
      classType: "London Dry Gin",
      abv: "40",
      business: "Bottled by Stone’s Throw Spirits, Baltimore, MD",
    },
  },
  {
    id: "import",
    label: "Maison du Verger · import",
    files: ["import.png"],
    application: {
      ...base,
      reference: "DEMO-004",
      beverage: "wine",
      brand: "Maison du Verger",
      classType: "Chardonnay",
      abv: "13.5",
      business: "Imported by Harbor Imports, New York, NY",
      imported: true,
      origin: "France",
    },
  },
  {
    id: "ambiguous",
    label: "Old Tom · conflicting percentages",
    files: ["ambiguous.png"],
    application: { ...base, reference: "DEMO-008" },
  },
  {
    id: "poor",
    label: "Old Tom · low quality",
    files: ["poor.png"],
    application: { ...base, reference: "DEMO-005" },
  },
  {
    id: "warning-case",
    label: "Old Tom · warning capitalization",
    files: ["warning-case.png"],
    application: { ...base, reference: "DEMO-006" },
  },
  {
    id: "blank",
    label: "Unreadable · blank image",
    files: ["blank.png"],
    application: { ...base, reference: "DEMO-007" },
  },
];
