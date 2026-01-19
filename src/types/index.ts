export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: string;
}

export interface Airline {
  iata: string;
  icao: string;
  name: string;
  country: string;
}

export interface Route {
  origin: string;
  destination: string;
  operators: string[];   // Airlines that actually operate this route
  codeshares: string[];  // Airlines that codeshare on this route
  aircraft: string[];
}

export interface RoutesByAirport {
  [airportCode: string]: Route[];
}

export interface Filters {
  airlines: string[];
  aircraft: string[];
  includeCodeshares: boolean;
}
