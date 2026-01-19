const fs = require('fs');
const path = require('path');

// Parse CSV with proper handling of quoted fields
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse DAT files (comma-separated, no headers)
function parseDAT(content, headers) {
  const lines = content.split('\n');
  const data = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      let val = values[index] || '';
      // Handle \N as null
      if (val === '\\N') val = '';
      row[header] = val;
    });
    data.push(row);
  }
  return data;
}

console.log('Processing airport data...');

// Read airports
const airportsCSV = fs.readFileSync(path.join(__dirname, '../data/airports.csv'), 'utf-8');
const rawAirports = parseCSV(airportsCSV);

// Filter to airports with IATA codes and scheduled service
const airports = rawAirports
  .filter(a => a.iata_code && a.iata_code.length === 3 && a.scheduled_service === 'yes')
  .map(a => ({
    iata: a.iata_code,
    icao: a.icao_code || '',
    name: a.name,
    city: a.municipality || '',
    country: a.iso_country,
    lat: parseFloat(a.latitude_deg),
    lon: parseFloat(a.longitude_deg),
    type: a.type
  }))
  .filter(a => !isNaN(a.lat) && !isNaN(a.lon));

console.log(`Processed ${airports.length} airports with scheduled service`);

// Create airport lookup map
const airportMap = {};
airports.forEach(a => {
  airportMap[a.iata] = a;
});

console.log('Processing airline data...');

// Read airlines
const airlinesDAT = fs.readFileSync(path.join(__dirname, '../data/airlines.dat'), 'utf-8');
const rawAirlines = parseDAT(airlinesDAT, [
  'id', 'name', 'alias', 'iata', 'icao', 'callsign', 'country', 'active'
]);

// Filter to active airlines with IATA codes
const airlines = rawAirlines
  .filter(a => a.iata && a.iata.length === 2 && a.active === 'Y')
  .map(a => ({
    iata: a.iata,
    icao: a.icao || '',
    name: a.name,
    country: a.country
  }));

console.log(`Processed ${airlines.length} active airlines`);

// Create airline lookup map
const airlineMap = {};
airlines.forEach(a => {
  airlineMap[a.iata] = a;
});

console.log('Processing route data...');

// Read routes
const routesDAT = fs.readFileSync(path.join(__dirname, '../data/routes.dat'), 'utf-8');
const rawRoutes = parseDAT(routesDAT, [
  'airline', 'airlineId', 'source', 'sourceId', 'dest', 'destId', 'codeshare', 'stops', 'equipment'
]);

// Process routes - group by origin-destination pair
// Separate operators (actual flights) from codeshares
const routeMap = {};

rawRoutes.forEach(r => {
  // Only include direct routes between airports we know
  if (!r.source || !r.dest || r.source.length !== 3 || r.dest.length !== 3) return;
  if (!airportMap[r.source] || !airportMap[r.dest]) return;
  
  const key = `${r.source}-${r.dest}`;
  const isCodeshare = r.codeshare === 'Y';
  
  if (!routeMap[key]) {
    routeMap[key] = {
      origin: r.source,
      destination: r.dest,
      operators: [],    // Airlines that actually operate this route
      codeshares: [],   // Airlines that codeshare on this route
      aircraft: []
    };
  }
  
  // Add airline to appropriate list
  if (r.airline && r.airline.length === 2) {
    if (isCodeshare) {
      if (!routeMap[key].codeshares.includes(r.airline)) {
        routeMap[key].codeshares.push(r.airline);
      }
    } else {
      if (!routeMap[key].operators.includes(r.airline)) {
        routeMap[key].operators.push(r.airline);
      }
    }
  }
  
  // Add equipment types (only from operators, not codeshares)
  if (r.equipment && !isCodeshare) {
    const equipment = r.equipment.split(' ');
    equipment.forEach(eq => {
      if (eq && !routeMap[key].aircraft.includes(eq)) {
        routeMap[key].aircraft.push(eq);
      }
    });
  }
});

const routes = Object.values(routeMap);
console.log(`Processed ${routes.length} unique routes`);

// Build routes by airport for quick lookup
const routesByAirport = {};

routes.forEach(route => {
  if (!routesByAirport[route.origin]) {
    routesByAirport[route.origin] = [];
  }
  routesByAirport[route.origin].push(route);
});

console.log(`Routes available from ${Object.keys(routesByAirport).length} airports`);

// Get unique aircraft types
const allAircraft = new Set();
routes.forEach(r => r.aircraft.forEach(a => allAircraft.add(a)));
const aircraftTypes = Array.from(allAircraft).sort();
console.log(`Found ${aircraftTypes.length} aircraft types`);

// Create output directory
const outputDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write processed data
fs.writeFileSync(
  path.join(outputDir, 'airports.json'),
  JSON.stringify(airports, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'airlines.json'),
  JSON.stringify(airlines, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'routes.json'),
  JSON.stringify(routes, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'routes-by-airport.json'),
  JSON.stringify(routesByAirport, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'aircraft-types.json'),
  JSON.stringify(aircraftTypes, null, 2)
);

// Stats
console.log('\n--- Summary ---');
console.log(`Airports: ${airports.length}`);
console.log(`Airlines: ${airlines.length}`);
console.log(`Routes: ${routes.length}`);
console.log(`Aircraft types: ${aircraftTypes.length}`);
console.log(`\nData written to ${outputDir}`);
