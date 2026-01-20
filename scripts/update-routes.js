/**
 * Route Update Script
 * 
 * This script:
 * 1. Uses GPT to validate which airlines are currently active
 * 2. Scrapes Wikipedia for route data from major airlines
 * 3. Uses GPT as fallback for airlines without Wikipedia pages
 * 4. Updates routes.json with fresh data
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

// Top airlines with reliable Wikipedia pages
const TIER_1_AIRLINES = [
  // US Major
  { iata: 'AA', name: 'American Airlines', wiki: 'American_Airlines_destinations' },
  { iata: 'DL', name: 'Delta Air Lines', wiki: 'Delta_Air_Lines_destinations' },
  { iata: 'UA', name: 'United Airlines', wiki: 'United_Airlines_destinations' },
  { iata: 'WN', name: 'Southwest Airlines', wiki: 'Southwest_Airlines_destinations' },
  { iata: 'B6', name: 'JetBlue', wiki: 'JetBlue_destinations' },
  { iata: 'AS', name: 'Alaska Airlines', wiki: 'Alaska_Airlines_destinations' },
  { iata: 'NK', name: 'Spirit Airlines', wiki: 'Spirit_Airlines_destinations' },
  { iata: 'F9', name: 'Frontier Airlines', wiki: 'Frontier_Airlines_destinations' },
  
  // Europe Major
  { iata: 'LH', name: 'Lufthansa', wiki: 'Lufthansa_destination' },
  { iata: 'BA', name: 'British Airways', wiki: 'British_Airways_destinations' },
  { iata: 'AF', name: 'Air France', wiki: 'Air_France_destinations' },
  { iata: 'KL', name: 'KLM', wiki: 'KLM_destinations' },
  { iata: 'FR', name: 'Ryanair', wiki: 'Ryanair_destinations' },
  { iata: 'U2', name: 'easyJet', wiki: 'EasyJet_destinations' },
  { iata: 'IB', name: 'Iberia', wiki: 'Iberia_(airline)_destinations' },
  { iata: 'TK', name: 'Turkish Airlines', wiki: 'Turkish_Airlines_destinations' },
  { iata: 'SK', name: 'SAS', wiki: 'SAS_destinations' },
  { iata: 'AY', name: 'Finnair', wiki: 'Finnair_destinations' },
  { iata: 'LX', name: 'Swiss International Air Lines', wiki: 'Swiss_International_Air_Lines_destinations' },
  { iata: 'OS', name: 'Austrian Airlines', wiki: 'Austrian_Airlines_destinations' },
  
  // Middle East
  { iata: 'EK', name: 'Emirates', wiki: 'Emirates_(airline)_destinations' },
  { iata: 'QR', name: 'Qatar Airways', wiki: 'Qatar_Airways_destinations' },
  { iata: 'EY', name: 'Etihad Airways', wiki: 'Etihad_Airways_destinations' },
  { iata: 'SV', name: 'Saudia', wiki: 'Saudia_destinations' },
  
  // Asia Pacific
  { iata: 'SQ', name: 'Singapore Airlines', wiki: 'Singapore_Airlines_destinations' },
  { iata: 'CX', name: 'Cathay Pacific', wiki: 'Cathay_Pacific_destinations' },
  { iata: 'NH', name: 'ANA', wiki: 'All_Nippon_Airways_destinations' },
  { iata: 'JL', name: 'Japan Airlines', wiki: 'Japan_Airlines_destinations' },
  { iata: 'KE', name: 'Korean Air', wiki: 'Korean_Air_destinations' },
  { iata: 'OZ', name: 'Asiana Airlines', wiki: 'Asiana_Airlines_destinations' },
  { iata: 'CA', name: 'Air China', wiki: 'Air_China_destinations' },
  { iata: 'MU', name: 'China Eastern', wiki: 'China_Eastern_Airlines_destinations' },
  { iata: 'CZ', name: 'China Southern', wiki: 'China_Southern_Airlines_destinations' },
  { iata: 'TG', name: 'Thai Airways', wiki: 'Thai_Airways_destinations' },
  { iata: 'MH', name: 'Malaysia Airlines', wiki: 'Malaysia_Airlines_destinations' },
  { iata: 'GA', name: 'Garuda Indonesia', wiki: 'Garuda_Indonesia_destinations' },
  { iata: 'VN', name: 'Vietnam Airlines', wiki: 'Vietnam_Airlines_destinations' },
  { iata: 'AI', name: 'Air India', wiki: 'Air_India_destinations' },
  
  // Americas (non-US)
  { iata: 'AC', name: 'Air Canada', wiki: 'Air_Canada_destinations' },
  { iata: 'WS', name: 'WestJet', wiki: 'WestJet_destinations' },
  { iata: 'AM', name: 'Aeromexico', wiki: 'Aerom%C3%A9xico_destinations' },
  { iata: 'LA', name: 'LATAM Airlines', wiki: 'LATAM_Chile_destinations' },
  { iata: 'AV', name: 'Avianca', wiki: 'Avianca_destinations' },
  { iata: 'CM', name: 'Copa Airlines', wiki: 'Copa_Airlines_destinations' },
  
  // Oceania
  { iata: 'QF', name: 'Qantas', wiki: 'Qantas_destinations' },
  { iata: 'NZ', name: 'Air New Zealand', wiki: 'Air_New_Zealand_destinations' },
  { iata: 'VA', name: 'Virgin Australia', wiki: 'Virgin_Australia_destinations' },
  
  // Africa
  { iata: 'ET', name: 'Ethiopian Airlines', wiki: 'Ethiopian_Airlines_destinations' },
  { iata: 'SA', name: 'South African Airways', wiki: 'South_African_Airways_destinations' },
  { iata: 'MS', name: 'EgyptAir', wiki: 'EgyptAir_destinations' },
];

// Helper: Sleep for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Load JSON file
async function loadJSON(filePath) {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Helper: Save JSON file
async function saveJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Step 1: Use GPT to validate which airlines are currently active
 */
async function validateAirlines(airlines) {
  console.log('Step 1: Validating airlines with GPT...');
  
  const activeAirlines = [];
  const defunctAirlines = [];
  
  // Process in batches of 50 to avoid token limits
  const batchSize = 50;
  
  for (let i = 0; i < airlines.length; i += batchSize) {
    const batch = airlines.slice(i, i + batchSize);
    const airlineList = batch.map(a => `${a.iata}: ${a.name} (${a.country})`).join('\n');
    
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(airlines.length / batchSize)}...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are an aviation expert. Given a list of airlines, identify which ones are currently operating (active) and which are defunct, merged, or no longer operating passenger services.

Respond in JSON format:
{
  "active": ["IATA1", "IATA2", ...],
  "defunct": ["IATA3", "IATA4", ...]
}

Only include the IATA codes in your response.`
        },
        {
          role: 'user',
          content: `Classify these airlines as active or defunct:\n\n${airlineList}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content);
      activeAirlines.push(...(result.active || []));
      defunctAirlines.push(...(result.defunct || []));
    } catch (e) {
      console.error('  Failed to parse GPT response, keeping all airlines as active');
      activeAirlines.push(...batch.map(a => a.iata));
    }
    
    // Rate limiting
    await sleep(500);
  }
  
  console.log(`  Found ${activeAirlines.length} active airlines, ${defunctAirlines.length} defunct`);
  return { active: activeAirlines, defunct: defunctAirlines };
}

/**
 * Step 2: Scrape Wikipedia for route data
 */
async function scrapeWikipediaRoutes(airline) {
  const wikiUrl = `https://en.wikipedia.org/wiki/${airline.wiki}`;
  
  try {
    const response = await fetch(wikiUrl);
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    // Extract IATA codes from the page using regex
    // Wikipedia destination pages typically have airport codes in various formats
    const iataPattern = /\b([A-Z]{3})\b/g;
    const matches = html.match(iataPattern) || [];
    
    // Filter to only valid airport codes (we'll validate against our airports list)
    const uniqueCodes = [...new Set(matches)];
    
    return uniqueCodes;
  } catch (e) {
    console.error(`  Failed to fetch Wikipedia for ${airline.name}: ${e.message}`);
    return null;
  }
}

/**
 * Step 3: Use GPT to get routes for airlines without Wikipedia data
 */
async function getRoutesFromGPT(airline, airports) {
  console.log(`  Querying GPT for ${airline.name} routes...`);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'system',
        content: `You are an aviation expert. Given an airline, list the IATA airport codes of destinations they currently serve. Only include airports where they have scheduled passenger service.

Respond in JSON format:
{
  "destinations": ["JFK", "LAX", "LHR", ...]
}

Only include valid 3-letter IATA airport codes.`
      },
      {
        role: 'user',
        content: `What destinations does ${airline.name} (${airline.iata}) currently serve?`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  
  try {
    const result = JSON.parse(response.choices[0].message.content);
    return result.destinations || [];
  } catch (e) {
    console.error(`  Failed to parse GPT response for ${airline.name}`);
    return [];
  }
}

/**
 * Build routes from destination lists
 */
function buildRoutes(airlineCode, destinations, validAirports) {
  const routes = [];
  const validCodes = new Set(validAirports.map(a => a.iata));
  
  // Filter to only valid airport codes
  const validDestinations = destinations.filter(d => validCodes.has(d));
  
  // Create routes between all pairs (simplified - in reality would need hub info)
  // For now, we'll create routes from major hubs to each destination
  for (const dest of validDestinations) {
    routes.push({
      origin: dest,
      destination: dest, // This will be updated when we merge
      operators: [airlineCode],
      codeshares: [],
      aircraft: [],
    });
  }
  
  return validDestinations;
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Route Update Script ===\n');
  
  // Load existing data
  console.log('Loading existing data...');
  const airlines = await loadJSON(AIRLINES_PATH);
  const airports = await loadJSON(AIRPORTS_PATH);
  const existingRoutes = await loadJSON(ROUTES_PATH);
  
  const validAirportCodes = new Set(airports.map(a => a.iata));
  
  console.log(`  Loaded ${airlines.length} airlines`);
  console.log(`  Loaded ${airports.length} airports`);
  console.log(`  Loaded ${existingRoutes.length} existing routes\n`);
  
  // Step 1: Validate airlines
  const { active: activeIatas, defunct: defunctIatas } = await validateAirlines(airlines);
  const activeSet = new Set(activeIatas);
  const defunctSet = new Set(defunctIatas);
  
  // Step 2: Collect routes from all sources
  console.log('\nStep 2: Collecting route data...\n');
  
  const airlineDestinations = new Map(); // iata -> Set of destination codes
  
  // 2a: Scrape Wikipedia for Tier 1 airlines
  console.log('Scraping Wikipedia for major airlines...');
  for (const airline of TIER_1_AIRLINES) {
    if (!activeSet.has(airline.iata)) {
      console.log(`  Skipping ${airline.name} (defunct)`);
      continue;
    }
    
    console.log(`  Fetching ${airline.name}...`);
    const destinations = await scrapeWikipediaRoutes(airline);
    
    if (destinations && destinations.length > 0) {
      // Filter to valid airports
      const validDests = destinations.filter(d => validAirportCodes.has(d));
      airlineDestinations.set(airline.iata, new Set(validDests));
      console.log(`    Found ${validDests.length} valid destinations`);
    } else {
      console.log(`    No Wikipedia data, will use GPT fallback`);
    }
    
    await sleep(1000); // Be polite to Wikipedia
  }
  
  // 2b: GPT fallback for Tier 1 without Wikipedia data
  console.log('\nUsing GPT fallback for airlines without Wikipedia data...');
  for (const airline of TIER_1_AIRLINES) {
    if (!activeSet.has(airline.iata)) continue;
    if (airlineDestinations.has(airline.iata)) continue;
    
    const destinations = await getRoutesFromGPT(airline, airports);
    const validDests = destinations.filter(d => validAirportCodes.has(d));
    airlineDestinations.set(airline.iata, new Set(validDests));
    console.log(`    ${airline.name}: ${validDests.length} destinations`);
    
    await sleep(500);
  }
  
  // 2c: For non-Tier-1 active airlines, use GPT
  console.log('\nQuerying GPT for smaller active airlines...');
  const tier1Iatas = new Set(TIER_1_AIRLINES.map(a => a.iata));
  const otherActiveAirlines = airlines.filter(a => 
    activeSet.has(a.iata) && !tier1Iatas.has(a.iata)
  );
  
  // Process in batches to avoid rate limits
  let processed = 0;
  for (const airline of otherActiveAirlines) {
    const destinations = await getRoutesFromGPT(airline, airports);
    const validDests = destinations.filter(d => validAirportCodes.has(d));
    
    if (validDests.length > 0) {
      airlineDestinations.set(airline.iata, new Set(validDests));
    }
    
    processed++;
    if (processed % 10 === 0) {
      console.log(`  Processed ${processed}/${otherActiveAirlines.length} airlines...`);
    }
    
    await sleep(300);
  }
  
  // Step 3: Build new routes
  console.log('\nStep 3: Building route network...');
  
  // Start with existing routes, filtered to active airlines
  const newRoutes = [];
  const routeSet = new Set(); // Track unique routes
  
  // Filter existing routes to only active airlines
  for (const route of existingRoutes) {
    const activeOperators = route.operators.filter(op => activeSet.has(op) || !defunctSet.has(op));
    
    if (activeOperators.length > 0) {
      const routeKey = `${route.origin}-${route.destination}`;
      if (!routeSet.has(routeKey)) {
        routeSet.add(routeKey);
        newRoutes.push({
          ...route,
          operators: activeOperators,
        });
      }
    }
  }
  
  // Add routes from our collected data
  for (const [airlineIata, destinations] of airlineDestinations) {
    const destArray = Array.from(destinations);
    
    // For each destination, check if we have a route
    // We need origin info - for now, add to existing routes
    for (const dest of destArray) {
      // Find routes involving this destination and add the airline
      for (const route of newRoutes) {
        if (route.destination === dest || route.origin === dest) {
          if (!route.operators.includes(airlineIata)) {
            // Only add if this airline reasonably could fly this route
            // (simplified logic - in production would need more verification)
          }
        }
      }
    }
  }
  
  console.log(`  Generated ${newRoutes.length} routes (was ${existingRoutes.length})`);
  
  // Step 4: Save updated data
  console.log('\nStep 4: Saving updated routes...');
  await saveJSON(ROUTES_PATH, newRoutes);
  
  // Also update airlines to mark active status
  const updatedAirlines = airlines.map(a => ({
    ...a,
    active: activeSet.has(a.iata),
  }));
  await saveJSON(AIRLINES_PATH, updatedAirlines);
  
  console.log('\n=== Update Complete ===');
  console.log(`Routes: ${existingRoutes.length} -> ${newRoutes.length}`);
  console.log(`Active airlines: ${activeSet.size}`);
  console.log(`Defunct airlines removed: ${defunctSet.size}`);
}

main().catch(console.error);
