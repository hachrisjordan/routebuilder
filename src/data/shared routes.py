import json
import os
from collections import defaultdict

def load_airline_routes(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
    routes = set()
    airline_code = filename.split('/')[-1].split('_')[0]  # Extract airline code from filename
    for route in data:
        # Create a directional tuple (departure -> arrival)
        route_pair = (route['Departure IATA'], route['Arrival IATA'])
        routes.add(route_pair)
    return airline_code, routes

def find_shared_routes():
    # Directory containing the airline files
    directory = 'src/data'
    
    # Dictionary to store routes and their airlines
    route_airlines = defaultdict(set)
    
    # Process each airline file
    for filename in os.listdir(directory):
        if filename.endswith('_miles.json'):
            filepath = os.path.join(directory, filename)
            airline_code, routes = load_airline_routes(filepath)
            
            # Add airline code to each route it serves
            for route in routes:
                route_airlines[route].add(airline_code)
    
    # Create output data structure
    shared_routes = []
    for route, airlines in route_airlines.items():
        if len(airlines) > 1:  # Only include routes shared by multiple airlines
            shared_routes.append({
                'origin': route[0],
                'destination': route[1],
                'airlines_shared': sorted(list(airlines))
            })
    
    # Sort by number of airlines shared (descending), then origin, then destination
    shared_routes.sort(key=lambda x: (-len(x['airlines_shared']), x['origin'], x['destination']))
    
    # Write to output file
    output_file = 'src/data/shared_routes.json'
    with open(output_file, 'w') as f:
        json.dump(shared_routes, f, indent=4)

if __name__ == "__main__":
    find_shared_routes()
