# FlightSeek

An interactive flight route explorer that visualizes airline networks worldwide. Click on any airport to see all destinations, filter by airline or aircraft type, and explore global aviation connectivity.

![FlightSeek Screenshot](screenshot.png)

## Features

- **Interactive World Map** - Dark-themed map with clickable airport markers
- **Route Visualization** - Great-circle arcs showing flight paths between airports
- **Airport Explorer** - Click any airport to see all destinations served
- **Airline Filter** - View routes operated by specific airlines
- **Aircraft Filter** - Filter routes by aircraft type (787, A320, 777, etc.)
- **Codeshare Toggle** - Option to include or exclude codeshare routes
- **Airline Network View** - Select an airline without an airport to see their entire route network
- **Search** - Find airports by IATA code, name, or city

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map**: Leaflet + React-Leaflet
- **Icons**: Lucide React

## Data Sources

All data is free and open source:

| Data | Source | Records |
|------|--------|---------|
| Airports | [OurAirports](https://ourairports.com/data/) | 4,144 with scheduled service |
| Routes | [OpenFlights](https://openflights.org/data.html) | 35,887 unique routes |
| Airlines | [OpenFlights](https://openflights.org/data.html) | 500+ active airlines |
| Aircraft | [OpenFlights](https://openflights.org/data.html) | 167 aircraft types |

**Note**: The OpenFlights data was last updated around 2014, so some routes and airlines may be outdated.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flightseek.git
cd flightseek

# Install dependencies
npm install

# Process the raw data (if needed)
node scripts/process-data.js

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
flightseek/
├── data/                    # Raw data files (CSV, DAT)
├── public/
│   └── data/               # Processed JSON data
│       ├── airports.json
│       ├── airlines.json
│       ├── routes.json
│       ├── routes-by-airport.json
│       └── aircraft-types.json
├── scripts/
│   └── process-data.js     # Data processing script
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main page
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── FlightMap.tsx   # Map component
│   │   └── Sidebar.tsx     # Sidebar with filters
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   └── types/
│       └── index.ts        # TypeScript types
└── package.json
```

## Usage

1. **Explore by Airport**: Click any blue dot on the map to select an airport and see all routes from that location.

2. **Filter by Airline**: Expand the Airlines filter, select one or more airlines to see only their routes. Toggle "Include codeshares" to see partner flights.

3. **Filter by Aircraft**: Expand the Aircraft filter to see routes operated by specific aircraft types.

4. **View Airline Networks**: Select an airline without selecting an airport to see the airline's entire route network globally.

5. **Search**: Use the search bar to find airports by IATA code (e.g., "JFK"), city name, or airport name.

6. **Reset**: Click the Reset button to clear all selections and filters.

## Known Limitations

- **Data Currency**: Route and airline data is from ~2014 and may not reflect current schedules
- **Codeshare Accuracy**: Codeshare relationships may be outdated
- **Schedule Data**: No real-time or timetable data (would require paid APIs)
- **Trans-Pacific Routes**: Routes crossing the antimeridian (date line) use extended coordinates and may require panning to view completely

## Future Improvements

- [ ] Integration with live flight data APIs
- [ ] Real-time flight tracking
- [ ] Timetable/schedule view
- [ ] Route comparison tool
- [ ] Historical network changes
- [ ] Mobile-responsive design improvements

## License

MIT

## Acknowledgments

- [OurAirports](https://ourairports.com/) for airport data
- [OpenFlights](https://openflights.org/) for route and airline data
- [CARTO](https://carto.com/) for dark map tiles
- [Leaflet](https://leafletjs.com/) for the mapping library
