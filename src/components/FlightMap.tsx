"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Airport, Route, Airline, Filters } from "@/types";
import { getArcPoints } from "@/lib/utils";

interface FlightMapProps {
  airports: Airport[];
  allRoutes: Route[];
  routesByAirport: { [key: string]: Route[] };
  airlines: Airline[];
  selectedAirport: Airport | null;
  onAirportSelect: (airport: Airport | null) => void;
  filters: Filters;
}

export default function FlightMap({
  airports,
  allRoutes,
  routesByAirport,
  airlines,
  selectedAirport,
  onAirportSelect,
  filters,
}: FlightMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Create airport lookup
  const airportMap = useRef<{ [key: string]: Airport }>({});
  useEffect(() => {
    airports.forEach((a) => {
      airportMap.current[a.iata] = a;
    });
  }, [airports]);

  // Create airline lookup
  const airlineMap = useRef<{ [key: string]: Airline }>({});
  useEffect(() => {
    airlines.forEach((a) => {
      airlineMap.current[a.iata] = a;
    });
  }, [airlines]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [30, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: false,
      maxBounds: [[-90, -540], [90, 540]], // Allow extended panning for continuous routes
      maxBoundsViscosity: 1.0,
    });

    // Dark theme tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add airport markers
  useEffect(() => {
    if (!mapReady || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Only show major airports initially (those with routes)
    const airportsWithRoutes = airports.filter((a) => routesByAirport[a.iata]);

    airportsWithRoutes.forEach((airport) => {
      const isSelected = selectedAirport?.iata === airport.iata;
      const hasRoutes = routesByAirport[airport.iata]?.length > 0;

      const marker = L.circleMarker([airport.lat, airport.lon], {
        radius: isSelected ? 8 : hasRoutes ? 4 : 2,
        fillColor: isSelected ? "#f59e0b" : "#3b82f6",
        color: isSelected ? "#fbbf24" : "#60a5fa",
        weight: isSelected ? 3 : 1,
        opacity: 1,
        fillOpacity: isSelected ? 1 : 0.8,
      });

      marker.bindTooltip(
        `<strong>${airport.iata}</strong><br/>${airport.city || airport.name}<br/>${airport.country}`,
        { direction: "top", offset: [0, -5] }
      );

      marker.on("click", () => {
        onAirportSelect(airport);
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [mapReady, airports, routesByAirport, selectedAirport, onAirportSelect]);

  // Draw routes for selected airport OR all routes for selected airline
  useEffect(() => {
    if (!mapReady || !routesLayerRef.current) return;

    routesLayerRef.current.clearLayers();

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

    // Determine which routes to show
    let routesToShow: Route[] = [];
    
    if (selectedAirport) {
      // Show routes from selected airport
      const routes = routesByAirport[selectedAirport.iata] || [];
      routesToShow = routes.filter((route) => {
        if (filters.airlines.length > 0) {
          if (!routeMatchesAirline(route, filters.airlines, filters.includeCodeshares)) return false;
        }
        if (filters.aircraft.length > 0) {
          if (!route.aircraft.some((a) => filters.aircraft.includes(a))) return false;
        }
        return true;
      });
    } else if (filters.airlines.length > 0) {
      // No airport selected but airline filter is active - show all routes for that airline
      routesToShow = allRoutes.filter((route) =>
        routeMatchesAirline(route, filters.airlines, filters.includeCodeshares)
      );
    }

    if (routesToShow.length === 0) return;

    // Generate consistent color for each airline
    const getAirlineColor = (airlineCode: string) => {
      const hue = (airlineCode.charCodeAt(0) * 137 + (airlineCode.charCodeAt(1) || 0) * 59) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    };

    routesToShow.forEach((route) => {
      const originAirport = airportMap.current[route.origin];
      const destAirport = airportMap.current[route.destination];
      if (!originAirport || !destAirport) return;

      // Get arc points for great circle route (continuous coordinates)
      const arcPoints = getArcPoints(
        [originAirport.lat, originAirport.lon],
        [destAirport.lat, destAirport.lon],
        30
      );

      // Use first matching operator for color
      const operators = route.operators || [];
      const colorAirline = filters.airlines.length > 0 
        ? operators.find(a => filters.airlines.includes(a)) || operators[0]
        : operators[0] || "XX";
      const color = getAirlineColor(colorAirline);

      const operatorNames = operators
        .slice(0, 3)
        .map((code) => airlineMap.current[code]?.name || code)
        .join(", ");
      const moreOperators = operators.length > 3 ? ` +${operators.length - 3} more` : "";

      const tooltipContent =
        `<strong>${route.origin} → ${route.destination}</strong><br/>` +
        `${destAirport.city || destAirport.name}<br/>` +
        `Operated by: ${operatorNames}${moreOperators}<br/>` +
        `Aircraft: ${route.aircraft.slice(0, 5).join(", ")}${route.aircraft.length > 5 ? "..." : ""}`;

      // Draw the continuous polyline
      const polyline = L.polyline(arcPoints as L.LatLngExpression[], {
        color: color,
        weight: 2,
        opacity: 0.6,
      });

      polyline.bindTooltip(tooltipContent, { sticky: true });

      polyline.on("click", () => {
        onAirportSelect(originAirport);
      });

      polyline.addTo(routesLayerRef.current!);

      // Add destination marker at the arc endpoint (may be at extended coordinates)
      const endPoint = arcPoints[arcPoints.length - 1];
      const destMarker = L.circleMarker(endPoint as L.LatLngExpression, {
        radius: 5,
        fillColor: color,
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
      });

      destMarker.bindTooltip(
        `<strong>${destAirport.iata}</strong><br/>${destAirport.city || destAirport.name}`,
        { direction: "top" }
      );

      destMarker.on("click", () => {
        onAirportSelect(destAirport);
      });

      destMarker.addTo(routesLayerRef.current!);
    });

    // Pan to selected airport if there is one
    if (selectedAirport && mapRef.current) {
      mapRef.current.setView([selectedAirport.lat, selectedAirport.lon], 4, {
        animate: true,
      });
    } else if (!selectedAirport && filters.airlines.length > 0 && mapRef.current) {
      // Zoom out to show all airline routes
      mapRef.current.setView([30, 0], 2, { animate: true });
    }
  }, [mapReady, selectedAirport, routesByAirport, allRoutes, filters, onAirportSelect]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: "100%" }}
    />
  );
}
