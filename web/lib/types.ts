// Frontend mirror of specs/001-flight-search-fares/data-model.md.

export type Airport = { code: string; name: string };

export type Leg = {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  from: string;
  to: string;
  departure: string | null;
  arrival: string | null;
  durationMinutes: number;
  aircraft: string | null;
};

export type FlightOffer = {
  id: string;
  price: number;
  currency: string;
  durationMinutes: number;
  stops: number;
  legs: Leg[];
  primaryAirline: string;
  co2Grams: number | null;
  basicEconomy: boolean;
};

export type FareCell = { date: string; price: number; currency: string | null };

export type SearchResponse = { offers: FlightOffer[]; query: Record<string, unknown> };
export type FaresResponse = { cells: FareCell[]; query: Record<string, unknown> };
export type ApiError = { error: { code: string; message: string } };

export type SeatType = "economy" | "premium_economy" | "business" | "first";
export type MaxStops =
  | "any"
  | "non_stop"
  | "one_stop_or_fewer"
  | "two_or_fewer_stops";
export type SortBy =
  | "cheapest"
  | "duration"
  | "departure"
  | "arrival"
  | "best"
  | "top";

export function isApiError(v: unknown): v is ApiError {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    typeof (v as ApiError).error?.code === "string"
  );
}

// --- presentation helpers ---
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  return iso.slice(11, 16); // local HH:MM from the ISO string
}

export function fmtPrice(n: number, currency: string | null): string {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${sym}${Math.round(n)}`;
}
