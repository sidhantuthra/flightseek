"use client";

import { useState, useMemo } from "react";
import { Search, Plane, Building2, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Airport, Route, Airline, Filters } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  airports: Airport[];
  airlines: Airline[];
  aircraftTypes: string[];
  selectedAirport: Airport | null;
  onAirportSelect: (airport: Airport | null) => void;
  routes: Route[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  routesByAirport: { [key: string]: Route[] };
  onReset: () => void;
}

export default function Sidebar({
  airports,
  airlines,
  aircraftTypes,
  selectedAirport,
  onAirportSelect,
  routes,
  filters,
  onFiltersChange,
  routesByAirport,
  onReset,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAirlineFilter, setShowAirlineFilter] = useState(false);
  const [showAircraftFilter, setShowAircraftFilter] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState("");
  const [aircraftSearch, setAircraftSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Create lookups
  const airlineMap = useMemo(() => {
    const map: { [key: string]: Airline } = {};
    airlines.forEach((a) => (map[a.iata] = a));
    return map;
  }, [airlines]);

  const airportMap = useMemo(() => {
    const map: { [key: string]: Airport } = {};
    airports.forEach((a) => (map[a.iata] = a));
    return map;
  }, [airports]);

  // Filter airports for search
  const filteredAirports = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return airports
      .filter(
        (a) =>
          a.iata.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [airports, searchQuery]);

  // Helper to check if route matches airline filter
  const routeMatchesAirline = (route: Route, airlineCodes: string[], includeCodeshares: boolean) => {
    const operators = route.operators || [];
    const codeshares = route.codeshares || [];
    const matchesOperator = operators.some((a) => airlineCodes.includes(a));
    if (matchesOperator) return true;
    if (includeCodeshares) {
      return codeshares.some((a) => airlineCodes.includes(a));
    }
    return false;
  };

  // Get current routes for selected airport
  const currentRoutes = useMemo(() => {
    if (!selectedAirport) return [];
    const airportRoutes = routesByAirport[selectedAirport.iata] || [];

    return airportRoutes.filter((route) => {
      if (filters.airlines.length > 0) {
        if (!routeMatchesAirline(route, filters.airlines, filters.includeCodeshares)) return false;
      }
      if (filters.aircraft.length > 0) {
        if (!route.aircraft.some((a) => filters.aircraft.includes(a))) return false;
      }
      return true;
    });
  }, [selectedAirport, routesByAirport, filters]);

  // Get airlines operating from selected airport
  const availableAirlines = useMemo(() => {
    if (!selectedAirport) return airlines;
    const airportRoutes = routesByAirport[selectedAirport.iata] || [];
    const airlineCodes = new Set<string>();
    airportRoutes.forEach((r) => {
      (r.operators || []).forEach((a) => airlineCodes.add(a));
      if (filters.includeCodeshares) {
        (r.codeshares || []).forEach((a) => airlineCodes.add(a));
      }
    });
    return airlines.filter((a) => airlineCodes.has(a.iata));
  }, [selectedAirport, routesByAirport, airlines, filters.includeCodeshares]);

  // Get aircraft types at selected airport
  const availableAircraft = useMemo(() => {
    if (!selectedAirport) return aircraftTypes;
    const airportRoutes = routesByAirport[selectedAirport.iata] || [];
    const types = new Set<string>();
    airportRoutes.forEach((r) => r.aircraft.forEach((a) => types.add(a)));
    return aircraftTypes.filter((a) => types.has(a));
  }, [selectedAirport, routesByAirport, aircraftTypes]);

  const filteredAirlines = useMemo(() => {
    let result = availableAirlines;
    
    // Filter by search query if present
    if (airlineSearch) {
      const q = airlineSearch.toLowerCase();
      result = result.filter(
        (a) => a.iata.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      );
    }
    
    // Sort alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableAirlines, airlineSearch]);

  const filteredAircraftTypes = useMemo(() => {
    if (!aircraftSearch) return availableAircraft;
    const q = aircraftSearch.toLowerCase();
    return availableAircraft.filter((a) => a.toLowerCase().includes(q));
  }, [availableAircraft, aircraftSearch]);

  const toggleAirline = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    onFiltersChange({ ...filters, airlines: newAirlines });
  };

  const toggleAircraft = (type: string) => {
    const newAircraft = filters.aircraft.includes(type)
      ? filters.aircraft.filter((a) => a !== type)
      : [...filters.aircraft, type];
    onFiltersChange({ ...filters, aircraft: newAircraft });
  };

  const clearFilters = () => {
    onFiltersChange({ airlines: [], aircraft: [], includeCodeshares: false });
  };

  const toggleCodeshares = () => {
    onFiltersChange({ ...filters, includeCodeshares: !filters.includeCodeshares });
  };

  const hasActiveFilters = filters.airlines.length > 0 || filters.aircraft.length > 0;

  return (
    <div 
      className={cn(
        "bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden transition-all duration-300",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 left-full -ml-3 z-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-1 rounded-r-md border border-l-0 border-zinc-700 transition-colors"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Collapsed View */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 gap-4">
          <Plane className="w-5 h-5 text-blue-400" />
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-zinc-400 hover:text-white p-2"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-zinc-400 hover:text-white p-2"
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          {selectedAirport && (
            <div className="text-amber-400 font-bold text-xs">{selectedAirport.iata}</div>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-400" />
                FlightSeeker
              </h1>
              {(selectedAirport || hasActiveFilters) && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                  title="Reset all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
            <p className="text-zinc-400 text-sm mt-1">Explore flight routes worldwide</p>
          </div>

      {/* Search */}
      <div className="p-4 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search airports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 text-white pl-10 pr-4 py-2 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Search Results */}
        {filteredAirports.length > 0 && (
          <div className="mt-2 bg-zinc-800 rounded-lg overflow-hidden">
            {filteredAirports.map((airport) => (
              <button
                key={airport.iata}
                onClick={() => {
                  onAirportSelect(airport);
                  setSearchQuery("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700 transition-colors"
              >
                <div className="text-white font-medium text-sm">
                  {airport.iata} - {airport.city || airport.name}
                </div>
                <div className="text-zinc-400 text-xs">{airport.country}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Airport */}
      {selectedAirport && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-amber-400 font-bold text-lg">{selectedAirport.iata}</div>
              <div className="text-white text-sm">{selectedAirport.name}</div>
              <div className="text-zinc-400 text-xs">
                {selectedAirport.city}, {selectedAirport.country}
              </div>
            </div>
            <button
              onClick={() => onAirportSelect(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-blue-400 font-medium">{currentRoutes.length}</span>
            <span className="text-zinc-400"> destinations</span>
            {hasActiveFilters && (
              <span className="text-zinc-500">
                {" "}
                (filtered from {routesByAirport[selectedAirport.iata]?.length || 0})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Airline Filter */}
        <div className="mb-3">
          <button
            onClick={() => setShowAirlineFilter(!showAirlineFilter)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
          >
            <span className="text-white">
              Airlines
              {filters.airlines.length > 0 && (
                <span className="ml-2 text-blue-400">({filters.airlines.length})</span>
              )}
            </span>
            {showAirlineFilter ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showAirlineFilter && (
            <div className="mt-2 bg-zinc-800 rounded-lg p-2">
              {/* Codeshare toggle */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-2 bg-zinc-700/50 rounded">
                <span className="text-zinc-300 text-xs">Include codeshares</span>
                <button
                  onClick={toggleCodeshares}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors",
                    filters.includeCodeshares ? "bg-blue-500" : "bg-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                      filters.includeCodeshares ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="Search airlines..."
                value={airlineSearch}
                onChange={(e) => setAirlineSearch(e.target.value)}
                className="w-full bg-zinc-700 text-white px-3 py-1.5 rounded text-xs placeholder:text-zinc-500 focus:outline-none mb-2"
              />
              <div className="max-h-40 overflow-y-auto">
                {filteredAirlines.slice(0, 20).map((airline) => (
                  <label
                    key={airline.iata}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.airlines.includes(airline.iata)}
                      onChange={() => toggleAirline(airline.iata)}
                      className="rounded bg-zinc-600 border-zinc-500 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-white text-xs">
                      {airline.iata} - {airline.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aircraft Filter */}
        <div>
          <button
            onClick={() => setShowAircraftFilter(!showAircraftFilter)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
          >
            <span className="text-white">
              Aircraft
              {filters.aircraft.length > 0 && (
                <span className="ml-2 text-blue-400">({filters.aircraft.length})</span>
              )}
            </span>
            {showAircraftFilter ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showAircraftFilter && (
            <div className="mt-2 bg-zinc-800 rounded-lg p-2 max-h-48 overflow-y-auto">
              <input
                type="text"
                placeholder="Search aircraft..."
                value={aircraftSearch}
                onChange={(e) => setAircraftSearch(e.target.value)}
                className="w-full bg-zinc-700 text-white px-3 py-1.5 rounded text-xs placeholder:text-zinc-500 focus:outline-none mb-2"
              />
              {filteredAircraftTypes.slice(0, 20).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.aircraft.includes(type)}
                    onChange={() => toggleAircraft(type)}
                    className="rounded bg-zinc-600 border-zinc-500 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-white text-xs">{type}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routes List */}
      <div className="flex-1 overflow-y-auto">
        {selectedAirport ? (
          <div className="p-2">
            <div className="text-xs text-zinc-400 px-2 py-1 mb-1">
              Destinations from {selectedAirport.iata}
            </div>
            {currentRoutes.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-8">
                No routes match your filters
              </div>
            ) : (
              currentRoutes.map((route) => {
                const dest = airportMap[route.destination];
                if (!dest) return null;

                // Show operators, and codeshares if enabled
                const operators = route.operators || [];
                const codeshares = route.codeshares || [];
                const allAirlines = filters.includeCodeshares 
                  ? [...operators, ...codeshares]
                  : operators;
                const airlineNames = allAirlines
                  .slice(0, 2)
                  .map((code) => airlineMap[code]?.name || code);

                return (
                  <button
                    key={route.destination}
                    onClick={() => onAirportSelect(dest)}
                    className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium text-sm">
                          {route.destination}
                        </span>
                        <span className="text-zinc-400 text-sm ml-2">
                          {dest.city || dest.name}
                        </span>
                      </div>
                      <div className="text-zinc-500 text-xs">{dest.country}</div>
                    </div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      {airlineNames.join(", ")}
                      {allAirlines.length > 2 && ` +${allAirlines.length - 2}`}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : filters.airlines.length > 0 ? (
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="text-blue-400 font-medium">
                {filters.airlines.map(code => airlineMap[code]?.name || code).join(", ")}
              </div>
              <div className="text-zinc-400 text-sm mt-1">
                {routes.filter(r => routeMatchesAirline(r, filters.airlines, filters.includeCodeshares)).length.toLocaleString()} routes
                {filters.includeCodeshares && <span className="text-zinc-500"> (incl. codeshares)</span>}
              </div>
            </div>
            <p className="text-zinc-500 text-xs text-center">
              Showing {filters.includeCodeshares ? "operated + codeshare" : "operated"} routes. Click an airport to focus.
            </p>
          </div>
        ) : (
          <div className="p-4 text-center">
            <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              Click on an airport on the map or search above to see its routes
            </p>
            <p className="text-zinc-500 text-xs mt-2">
              Or select an airline to see all its routes
            </p>
            <div className="mt-4 text-zinc-500 text-xs">
              <div>{airports.length.toLocaleString()} airports</div>
              <div>{routes.length.toLocaleString()} routes</div>
              <div>{airlines.length.toLocaleString()} airlines</div>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
