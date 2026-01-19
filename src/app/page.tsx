"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Airport, Airline, Route, RoutesByAirport, Filters } from "@/types";
import Sidebar from "@/components/Sidebar";

// Dynamic import for Leaflet (no SSR)
const FlightMap = dynamic(() => import("@/components/FlightMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
      <div className="text-zinc-400">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesByAirport, setRoutesByAirport] = useState<RoutesByAirport>({});
  const [aircraftTypes, setAircraftTypes] = useState<string[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [filters, setFilters] = useState<Filters>({ airlines: [], aircraft: [], includeCodeshares: false });
  const [loading, setLoading] = useState(true);

  const handleReset = () => {
    setSelectedAirport(null);
    setFilters({ airlines: [], aircraft: [], includeCodeshares: false });
  };

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [airportsRes, airlinesRes, routesRes, routesByAirportRes, aircraftRes] =
          await Promise.all([
            fetch("/data/airports.json"),
            fetch("/data/airlines.json"),
            fetch("/data/routes.json"),
            fetch("/data/routes-by-airport.json"),
            fetch("/data/aircraft-types.json"),
          ]);

        const [airportsData, airlinesData, routesData, routesByAirportData, aircraftData] =
          await Promise.all([
            airportsRes.json(),
            airlinesRes.json(),
            routesRes.json(),
            routesByAirportRes.json(),
            aircraftRes.json(),
          ]);

        setAirports(airportsData);
        setAirlines(airlinesData);
        setRoutes(routesData);
        setRoutesByAirport(routesByAirportData);
        setAircraftTypes(aircraftData);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-zinc-400">Loading flight data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
        airports={airports}
        airlines={airlines}
        aircraftTypes={aircraftTypes}
        selectedAirport={selectedAirport}
        onAirportSelect={setSelectedAirport}
        routes={routes}
        filters={filters}
        onFiltersChange={setFilters}
        routesByAirport={routesByAirport}
        onReset={handleReset}
      />
      <div className="flex-1 relative">
        <FlightMap
          airports={airports}
          allRoutes={routes}
          routesByAirport={routesByAirport}
          airlines={airlines}
          selectedAirport={selectedAirport}
          onAirportSelect={setSelectedAirport}
          filters={filters}
        />
        
        {/* Stats overlay */}
        <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-zinc-400">
          {selectedAirport ? (
            <>
              Showing routes from <span className="text-amber-400 font-medium">{selectedAirport.iata}</span>
            </>
          ) : (
            <>Click an airport to explore routes</>
          )}
        </div>
      </div>
    </div>
  );
}
