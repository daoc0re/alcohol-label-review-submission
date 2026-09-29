export type Beverage = "spirits" | "wine" | "malt";
export type Status =
  | "Match"
  | "Mismatch"
  | "Unable to Verify"
  | "Manual Review";
export type Field =
  | "brand"
  | "classType"
  | "abv"
  | "netContents"
  | "business"
  | "origin"
  | "warning"
  | "presentation"
  | "category";
export interface Application {
  reference: string;
  beverage: Beverage;
  brand: string;
  classType: string;
  abv: string;
  netContents: string;
  business: string;
  imported: boolean;
  origin: string;
}
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface OcrLine {
  text: string;
  confidence: number;
  minWordConfidence: number;
  box: Box;
  panel: number;
}
export interface OcrPanel {
  name: string;
  text: string;
  confidence: number;
  lines: OcrLine[];
  width: number;
  height: number;
  seconds: number;
  qualityNotes: string[];
}
export interface Candidate {
  text: string;
  lines: OcrLine[];
  value?: number;
  unit?: string;
  ambiguous?: string;
}
export interface Result {
  field: Field;
  label: string;
  status: Status;
  expected: string;
  observed: string;
  reason: string;
  evidence: OcrLine[];
  reference?: string;
}
export interface Review {
  application: Application;
  results: Result[];
  panels: OcrPanel[];
  seconds: number;
  completedAt: string;
}
export const EMPTY_APPLICATION: Application = {
  reference: "",
  beverage: "spirits",
  brand: "",
  classType: "",
  abv: "",
  netContents: "",
  business: "",
  imported: false,
  origin: "",
};
export const STATUS_ORDER: Status[] = [
  "Mismatch",
  "Unable to Verify",
  "Manual Review",
  "Match",
];
