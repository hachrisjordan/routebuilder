from geopy.distance import great_circle
import json

class ItineraryBuilder:
    def __init__(self):
        # Load flight segments data
        with open('src/data/UA_miles.json') as f:
            self.ua_segments = json.load(f)
        with open('src/data/SQ_miles.json') as f:
            self.sq_segments = json.load(f)
        
        # Load airports data for zone information
        with open('src/data/airports.js', 'r') as f:
            # Skip the "export const airports = " part and parse the JSON
            airports_data = f.read()
            airports_data = airports_data[airports_data.find('['):airports_data.rfind(']')+1]
            self.airports = json.loads(airports_data)
        
        # Create airport zone lookup
        self.airport_zones = {
            airport['IATA']: airport['Zone']
            for airport in self.airports
        }
        
        # Combine segments from both airlines
        self.all_segments = self.ua_segments + self.sq_segments
        
        # Create lookup dictionary for faster access
        self.segments_dict = {}
        for segment in self.all_segments:
            origin = segment['Departure IATA']
            if origin not in self.segments_dict:
                self.segments_dict[origin] = []
            self.segments_dict[origin].append(segment)

    def _is_valid_connection(self, segments, origin_zone=None, dest_zone=None):
        """Check if the connection follows zone rules"""
        if len(segments) <= 1:
            return True
            
        # Get zones for all airports in the itinerary
        zones = [self.airport_zones[segments[0]['Departure IATA']]]
        for segment in segments:
            zones.append(self.airport_zones[segment['Arrival IATA']])
        
        origin_zone = zones[0]
        dest_zone = zones[-1]
        
        # Rule 1: For connecting itineraries within a single zone,
        # connecting via a third zone is not permitted
        if origin_zone == dest_zone:
            for zone in zones[1:-1]:  # Check intermediate zones
                if zone != origin_zone:
                    return False
        
        # Rule 2: North America to/from Atlantic: connection must not be Pacific Zone
        if (origin_zone == "North America" and dest_zone == "Atlantic") or \
           (origin_zone == "Atlantic" and dest_zone == "North America"):
            if "Pacific" in zones:
                return False
        
        # Rule 3: North America to/from South America: connection must not be Pacific or Atlantic Zone
        if (origin_zone == "North America" and dest_zone == "South America") or \
           (origin_zone == "South America" and dest_zone == "North America"):
            if "Pacific" in zones or "Atlantic" in zones:
                return False
        
        return True

    def _calculate_direct_distance(self, origin, destination):
        """Calculate direct distance between two airports using geopy"""
        origin_airport = next(a for a in self.airports if a['IATA'] == origin)
        dest_airport = next(a for a in self.airports if a['IATA'] == destination)
        
        return great_circle(
            (origin_airport['Latitude'], origin_airport['Longitude']),
            (dest_airport['Latitude'], dest_airport['Longitude'])
        ).miles

    def find_possible_itineraries(self, origin, destination, max_segments=6):
        """Find all possible itineraries between origin and destination"""
        direct_distance = self._calculate_direct_distance(origin, destination)
        max_total_distance = direct_distance * 2
        valid_itineraries = []
        
        def build_itinerary(current_origin, path, total_distance):
            if current_origin == destination:
                if len(path) <= max_segments:
                    valid_itineraries.append(path.copy())
                return
            
            if len(path) >= max_segments or total_distance >= max_total_distance:
                return
            
            possible_segments = self.segments_dict.get(current_origin, [])
            
            for segment in possible_segments:
                next_destination = segment['Arrival IATA']
                segment_distance = segment['Flight Distance (miles)']
                
                # Skip if already visited (prevent loops)
                if any(s['Arrival IATA'] == next_destination for s in path):
                    continue
                
                # Skip if this would exceed max distance
                if total_distance + segment_distance > max_total_distance:
                    continue
                
                # Check zone rules
                if not self._is_valid_connection(path + [segment]):
                    continue
                
                build_itinerary(next_destination, path + [segment], 
                              total_distance + segment_distance)
        
        build_itinerary(origin, [], 0)
        return valid_itineraries

# Test the implementation
if __name__ == "__main__":
    builder = ItineraryBuilder()
    
    # Test cases covering different zone scenarios
    test_cases = [
        ('SFO', 'LHR'),  # North America to Atlantic
        ('JFK', 'NRT'),  # North America to Pacific
        ('LAX', 'SCL'),  # North America to South America
        ('SFO', 'ORD'),  # Within North America
        ('LHR', 'SIN'),  # Atlantic to Pacific
    ]
    
    for origin, destination in test_cases:
        direct_distance = builder._calculate_direct_distance(origin, destination)
        print(f"\nFinding routes from {origin} to {destination}:")
        print(f"Direct distance: {int(direct_distance)} miles")
        print(f"Maximum allowed distance: {int(direct_distance * 2)} miles")
        
        itineraries = builder.find_possible_itineraries(origin, destination, max_segments=3)
        
        print(f"Found {len(itineraries)} valid itineraries")
        for idx, itinerary in enumerate(itineraries[:3], 1):
            print(f"\nItinerary {idx}:")
            total_distance = 0
            for segment in itinerary:
                print(f"  {segment['Departure IATA']} ({builder.airport_zones[segment['Departure IATA']]}) -> "
                      f"{segment['Arrival IATA']} ({builder.airport_zones[segment['Arrival IATA']]}) "
                      f"({segment['Flight Distance (miles)']} miles)")
                total_distance += segment['Flight Distance (miles)']
            print(f"Total distance: {total_distance} miles")
            print(f"Distance difference from direct: +{int(total_distance - direct_distance)} miles "
                  f"({int((total_distance/direct_distance - 1) * 100)}% longer)") 