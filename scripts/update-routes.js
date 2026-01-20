/**
 * Route Update Script - Airport-Based Approach
 * 
 * This script:
 * 1. Scrapes Wikipedia airport pages for "Airlines and destinations" tables
 * 2. Extracts airline and destination data from each airport
 * 3. Builds a complete route network from this data
 * 4. Uses GPT to validate/match airline names to IATA codes
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Paths
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const AIRLINES_PATH = path.join(DATA_DIR, 'airlines.json');
const AIRPORTS_PATH = path.join(DATA_DIR, 'airports.json');
const ROUTES_PATH = path.join(DATA_DIR, 'routes.json');

// Major airports to scrape (by traffic/importance)
// These have well-maintained Wikipedia pages
const MAJOR_AIRPORTS = [
  // North America - Major Hubs
  { iata: 'ATL', wiki: 'Hartsfield–Jackson_Atlanta_International_Airport' },
  { iata: 'LAX', wiki: 'Los_Angeles_International_Airport' },
  { iata: 'ORD', wiki: "O'Hare_International_Airport" },
  { iata: 'DFW', wiki: 'Dallas/Fort_Worth_International_Airport' },
  { iata: 'DEN', wiki: 'Denver_International_Airport' },
  { iata: 'JFK', wiki: 'John_F._Kennedy_International_Airport' },
  { iata: 'SFO', wiki: 'San_Francisco_International_Airport' },
  { iata: 'SEA', wiki: 'Seattle–Tacoma_International_Airport' },
  { iata: 'LAS', wiki: 'Harry_Reid_International_Airport' },
  { iata: 'MCO', wiki: 'Orlando_International_Airport' },
  { iata: 'EWR', wiki: 'Newark_Liberty_International_Airport' },
  { iata: 'MIA', wiki: 'Miami_International_Airport' },
  { iata: 'PHX', wiki: 'Phoenix_Sky_Harbor_International_Airport' },
  { iata: 'IAH', wiki: 'George_Bush_Intercontinental_Airport' },
  { iata: 'BOS', wiki: 'Logan_International_Airport' },
  { iata: 'MSP', wiki: 'Minneapolis–Saint_Paul_International_Airport' },
  { iata: 'DTW', wiki: 'Detroit_Metropolitan_Airport' },
  { iata: 'PHL', wiki: 'Philadelphia_International_Airport' },
  { iata: 'LGA', wiki: 'LaGuardia_Airport' },
  { iata: 'BWI', wiki: 'Baltimore/Washington_International_Airport' },
  { iata: 'SLC', wiki: 'Salt_Lake_City_International_Airport' },
  { iata: 'DCA', wiki: 'Ronald_Reagan_Washington_National_Airport' },
  { iata: 'IAD', wiki: 'Washington_Dulles_International_Airport' },
  { iata: 'SAN', wiki: 'San_Diego_International_Airport' },
  { iata: 'TPA', wiki: 'Tampa_International_Airport' },
  { iata: 'YYZ', wiki: 'Toronto_Pearson_International_Airport' },
  { iata: 'YVR', wiki: 'Vancouver_International_Airport' },
  { iata: 'YUL', wiki: 'Montréal–Trudeau_International_Airport' },
  { iata: 'MEX', wiki: 'Mexico_City_International_Airport' },
  { iata: 'CUN', wiki: 'Cancún_International_Airport' },
  
  // Europe - Major Hubs
  { iata: 'LHR', wiki: 'Heathrow_Airport' },
  { iata: 'CDG', wiki: 'Charles_de_Gaulle_Airport' },
  { iata: 'AMS', wiki: 'Amsterdam_Airport_Schiphol' },
  { iata: 'FRA', wiki: 'Frankfurt_Airport' },
  { iata: 'IST', wiki: 'Istanbul_Airport' },
  { iata: 'MAD', wiki: 'Adolfo_Suárez_Madrid–Barajas_Airport' },
  { iata: 'BCN', wiki: 'Barcelona–El_Prat_Airport' },
  { iata: 'LGW', wiki: 'Gatwick_Airport' },
  { iata: 'MUC', wiki: 'Munich_Airport' },
  { iata: 'FCO', wiki: 'Leonardo_da_Vinci–Fiumicino_Airport' },
  { iata: 'DUB', wiki: 'Dublin_Airport' },
  { iata: 'ZRH', wiki: 'Zurich_Airport' },
  { iata: 'CPH', wiki: 'Copenhagen_Airport' },
  { iata: 'VIE', wiki: 'Vienna_International_Airport' },
  { iata: 'OSL', wiki: 'Oslo_Airport,_Gardermoen' },
  { iata: 'ARN', wiki: 'Stockholm_Arlanda_Airport' },
  { iata: 'HEL', wiki: 'Helsinki_Airport' },
  { iata: 'LIS', wiki: 'Lisbon_Airport' },
  { iata: 'BRU', wiki: 'Brussels_Airport' },
  { iata: 'MAN', wiki: 'Manchester_Airport' },
  { iata: 'STN', wiki: 'London_Stansted_Airport' },
  
  // Asia - Major Hubs  
  { iata: 'DXB', wiki: 'Dubai_International_Airport' },
  { iata: 'HND', wiki: 'Haneda_Airport' },
  { iata: 'NRT', wiki: 'Narita_International_Airport' },
  { iata: 'SIN', wiki: 'Singapore_Changi_Airport' },
  { iata: 'HKG', wiki: 'Hong_Kong_International_Airport' },
  { iata: 'ICN', wiki: 'Incheon_International_Airport' },
  { iata: 'PVG', wiki: 'Shanghai_Pudong_International_Airport' },
  { iata: 'PEK', wiki: 'Beijing_Capital_International_Airport' },
  { iata: 'BKK', wiki: 'Suvarnabhumi_Airport' },
  { iata: 'KUL', wiki: 'Kuala_Lumpur_International_Airport' },
  { iata: 'DEL', wiki: 'Indira_Gandhi_International_Airport' },
  { iata: 'BOM', wiki: 'Chhatrapati_Shivaji_Maharaj_International_Airport' },
  { iata: 'DOH', wiki: 'Hamad_International_Airport' },
  { iata: 'AUH', wiki: 'Abu_Dhabi_International_Airport' },
  { iata: 'TPE', wiki: 'Taiwan_Taoyuan_International_Airport' },
  { iata: 'MNL', wiki: 'Ninoy_Aquino_International_Airport' },
  { iata: 'CGK', wiki: 'Soekarno–Hatta_International_Airport' },
  { iata: 'BLR', wiki: 'Kempegowda_International_Airport' },
  { iata: 'HYD', wiki: 'Rajiv_Gandhi_International_Airport' },
  { iata: 'MAA', wiki: 'Chennai_International_Airport' },
  
  // Oceania
  { iata: 'SYD', wiki: 'Sydney_Airport' },
  { iata: 'MEL', wiki: 'Melbourne_Airport' },
  { iata: 'BNE', wiki: 'Brisbane_Airport' },
  { iata: 'AKL', wiki: 'Auckland_Airport' },
  { iata: 'PER', wiki: 'Perth_Airport' },
  
  // South America
  { iata: 'GRU', wiki: 'São_Paulo–Guarulhos_International_Airport' },
  { iata: 'EZE', wiki: 'Ministro_Pistarini_International_Airport' },
  { iata: 'BOG', wiki: 'El_Dorado_International_Airport' },
  { iata: 'SCL', wiki: 'Santiago_International_Airport' },
  { iata: 'LIM', wiki: 'Jorge_Chávez_International_Airport' },
  { iata: 'GIG', wiki: 'Rio_de_Janeiro–Galeão_International_Airport' },
  
  // Africa & Middle East
  { iata: 'JNB', wiki: 'O._R._Tambo_International_Airport' },
  { iata: 'CAI', wiki: 'Cairo_International_Airport' },
  { iata: 'ADD', wiki: 'Addis_Ababa_Bole_International_Airport' },
  { iata: 'CMN', wiki: 'Mohammed_V_International_Airport' },
  { iata: 'NBO', wiki: 'Jomo_Kenyatta_International_Airport' },
  { iata: 'CPT', wiki: 'Cape_Town_International_Airport' },
  { iata: 'LOS', wiki: 'Murtala_Muhammed_International_Airport' },
  { iata: 'TLV', wiki: 'Ben_Gurion_Airport' },
  { iata: 'AMM', wiki: 'Queen_Alia_International_Airport' },
  { iata: 'RUH', wiki: 'King_Khalid_International_Airport' },
  { iata: 'JED', wiki: 'King_Abdulaziz_International_Airport' },
];

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadJSON(filePath) {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function saveJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Scrape Wikipedia airport page for airlines and destinations
 */
async function scrapeAirportWikipedia(airport) {
  const url = `https://en.wikipedia.org/wiki/${airport.wiki}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    Failed to fetch ${airport.iata}: HTTP ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Find the Airlines and destinations section
    // Look for tables after the "Airlines and destinations" heading
    const airlinesSection = html.match(/id="Airlines_and_destinations"[\s\S]*?(<table[\s\S]*?<\/table>)/i);
    
    if (!airlinesSection) {
      // Try alternate section names
      const altSection = html.match(/id="Passenger"[\s\S]*?(<table[\s\S]*?<\/table>)/i) ||
                        html.match(/id="Airlines"[\s\S]*?(<table[\s\S]*?<\/table>)/i);
      if (!altSection) {
        console.log(`    No airlines table found for ${airport.iata}`);
        return null;
      }
    }
    
    // Extract all tables from the page
    const tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>[\s\S]*?<\/table>/gi) || [];
    
    const routes = [];
    
    for (const table of tables) {
      // Check if this looks like an airlines/destinations table
      if (!table.includes('Destinations') && !table.includes('destinations')) continue;
      
      // Parse table rows
      const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
      
      for (const row of rows) {
        // Extract cells
        const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        
        if (cells.length >= 2) {
          // First cell usually contains airline info
          const airlineCell = cells[0];
          // Second or last cell usually contains destinations
          const destCell = cells[cells.length - 1];
          
          // Extract airline IATA codes or names from links
          const airlineMatches = airlineCell.match(/title="([^"]+)"/g) || [];
          const airlineNames = airlineMatches.map(m => m.replace(/title="|"/g, ''));
          
          // Extract destination airport codes
          // Look for 3-letter codes in parentheses or links
          const destCodes = destCell.match(/\b([A-Z]{3})\b/g) || [];
          
          // Also try to extract from links like [[Airport Name|CODE]]
          const destLinks = destCell.match(/title="[^"]*Airport[^"]*"/gi) || [];
          
          if (destCodes.length > 0 && airlineNames.length > 0) {
            routes.push({
              airlines: airlineNames,
              destinations: [...new Set(destCodes)]
            });
          }
        }
      }
    }
    
    return routes;
  } catch (error) {
    console.log(`    Error scraping ${airport.iata}: ${error.message}`);
    return null;
  }
}

/**
 * Use GPT to match airline names to IATA codes
 */
async function matchAirlineToIATA(airlineName, knownAirlines) {
  // First try exact match
  const exactMatch = knownAirlines.find(a => 
    a.name.toLowerCase() === airlineName.toLowerCase() ||
    a.iata === airlineName
  );
  if (exactMatch) return exactMatch.iata;
  
  // Try partial match
  const partialMatch = knownAirlines.find(a => 
    a.name.toLowerCase().includes(airlineName.toLowerCase()) ||
    airlineName.toLowerCase().includes(a.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.iata;
  
  return null;
}

/**
 * Use GPT to batch match unknown airline names to IATA codes
 */
async function batchMatchAirlines(unknownNames, knownAirlines) {
  if (unknownNames.length === 0) return {};
  
  const airlineList = knownAirlines.map(a => `${a.iata}: ${a.name}`).join('\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'system',
        content: `You are an aviation expert. Given airline names, match them to their IATA codes from this list:

${airlineList}

Respond in JSON format:
{
  "matches": {
    "Airline Name": "XX",
    ...
  }
}

If you can't find a match, use null. Only use codes from the provided list.`
      },
      {
        role: 'user',
        content: `Match these airline names to IATA codes:\n${unknownNames.join('\n')}`
      }
    ],
    response_format: { type: 'json_object' },
  });
  
  try {
    const result = JSON.parse(response.choices[0].message.content);
    return result.matches || {};
  } catch (e) {
    console.error('Failed to parse GPT response for airline matching');
    return {};
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Route Update Script (Airport-Based) ===\n');
  
  // Load existing data
  console.log('Loading existing data...');
  const airlines = await loadJSON(AIRLINES_PATH);
  const airports = await loadJSON(AIRPORTS_PATH);
  const existingRoutes = await loadJSON(ROUTES_PATH);
  
  const validAirportCodes = new Set(airports.map(a => a.iata));
  const airlineByName = new Map();
  const airlineByIATA = new Map();
  
  for (const airline of airlines) {
    airlineByName.set(airline.name.toLowerCase(), airline.iata);
    airlineByIATA.set(airline.iata, airline);
  }
  
  console.log(`  Loaded ${airlines.length} airlines`);
  console.log(`  Loaded ${airports.length} airports`);
  console.log(`  Loaded ${existingRoutes.length} existing routes\n`);
  
  // Step 1: Scrape Wikipedia for each major airport
  console.log('Step 1: Scraping Wikipedia airport pages...\n');
  
  const allRoutes = new Map(); // "ORIGIN-DEST" -> { operators: Set, ... }
  const unknownAirlines = new Set();
  let successCount = 0;
  let failCount = 0;
  
  for (const airport of MAJOR_AIRPORTS) {
    console.log(`  Scraping ${airport.iata}...`);
    
    const data = await scrapeAirportWikipedia(airport);
    
    if (data && data.length > 0) {
      successCount++;
      let routeCount = 0;
      
      for (const entry of data) {
        for (const dest of entry.destinations) {
          // Validate destination is a real airport
          if (!validAirportCodes.has(dest)) continue;
          if (dest === airport.iata) continue; // Skip self-routes
          
          const routeKey = `${airport.iata}-${dest}`;
          const reverseKey = `${dest}-${airport.iata}`;
          
          // Initialize route if needed
          if (!allRoutes.has(routeKey)) {
            allRoutes.set(routeKey, {
              origin: airport.iata,
              destination: dest,
              operators: new Set(),
              codeshares: [],
              aircraft: []
            });
          }
          
          // Try to match airlines
          for (const airlineName of entry.airlines) {
            const iata = await matchAirlineToIATA(airlineName, airlines);
            if (iata) {
              allRoutes.get(routeKey).operators.add(iata);
              routeCount++;
            } else if (airlineName.length > 2) {
              unknownAirlines.add(airlineName);
            }
          }
        }
      }
      
      console.log(`    Found ${routeCount} route-airline pairs`);
    } else {
      failCount++;
    }
    
    // Rate limiting - be polite to Wikipedia
    await sleep(1500);
  }
  
  console.log(`\n  Scraped ${successCount}/${MAJOR_AIRPORTS.length} airports successfully`);
  
  // Step 2: Use GPT to match unknown airlines
  if (unknownAirlines.size > 0) {
    console.log(`\nStep 2: Matching ${unknownAirlines.size} unknown airline names with GPT...`);
    
    const unknownList = Array.from(unknownAirlines).slice(0, 100); // Limit to avoid huge API calls
    const matches = await batchMatchAirlines(unknownList, airlines);
    
    let matchCount = 0;
    for (const [name, iata] of Object.entries(matches)) {
      if (iata) {
        airlineByName.set(name.toLowerCase(), iata);
        matchCount++;
      }
    }
    console.log(`  Matched ${matchCount} additional airlines`);
  }
  
  // Step 3: Merge with existing routes
  console.log('\nStep 3: Merging with existing routes...');
  
  // Convert existing routes to map for easy lookup
  const existingRouteMap = new Map();
  for (const route of existingRoutes) {
    const key = `${route.origin}-${route.destination}`;
    existingRouteMap.set(key, route);
  }
  
  // Merge: keep existing routes, add/update from scraped data
  const finalRoutes = [];
  const processedKeys = new Set();
  
  // First, add all scraped routes
  for (const [key, route] of allRoutes) {
    const existing = existingRouteMap.get(key);
    
    if (existing) {
      // Merge operators
      const mergedOperators = new Set([...existing.operators, ...route.operators]);
      finalRoutes.push({
        origin: route.origin,
        destination: route.destination,
        operators: Array.from(mergedOperators),
        codeshares: existing.codeshares || [],
        aircraft: existing.aircraft || []
      });
    } else {
      // New route from Wikipedia
      finalRoutes.push({
        origin: route.origin,
        destination: route.destination,
        operators: Array.from(route.operators),
        codeshares: [],
        aircraft: []
      });
    }
    
    processedKeys.add(key);
  }
  
  // Then, keep existing routes that weren't in scraped data
  // (routes between non-major airports)
  for (const route of existingRoutes) {
    const key = `${route.origin}-${route.destination}`;
    if (!processedKeys.has(key)) {
      finalRoutes.push(route);
      processedKeys.add(key);
    }
  }
  
  // Remove routes with no operators
  const validRoutes = finalRoutes.filter(r => r.operators && r.operators.length > 0);
  
  console.log(`  Total routes: ${validRoutes.length}`);
  console.log(`  New routes added: ${validRoutes.length - existingRoutes.length}`);
  
  // Step 4: Save
  console.log('\nStep 4: Saving updated routes...');
  await saveJSON(ROUTES_PATH, validRoutes);
  
  // Update airlines with active flag based on routes
  const activeAirlines = new Set();
  for (const route of validRoutes) {
    for (const op of route.operators) {
      activeAirlines.add(op);
    }
  }
  
  const updatedAirlines = airlines.map(a => ({
    ...a,
    active: activeAirlines.has(a.iata)
  }));
  await saveJSON(AIRLINES_PATH, updatedAirlines);
  
  console.log('\n=== Update Complete ===');
  console.log(`Routes: ${existingRoutes.length} -> ${validRoutes.length}`);
  console.log(`Active airlines: ${activeAirlines.size}`);
  console.log(`Airports scraped: ${successCount}`);
}

main().catch(console.error);
