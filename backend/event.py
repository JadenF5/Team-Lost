from flask import Blueprint, jsonify, request
from db import get_event_w_id, events_container
import requests
import os
from dotenv import load_dotenv

load_dotenv()
event_bp = Blueprint("event", __name__)


@event_bp.route("/api/event", methods=["GET"])
def fetch_event():
    event_id = request.args.get("id")

    if event_id:
        event = get_event_w_id(event_id)
    else:
        event = None

    if event:
        # Try to enhance the location data if it's minimal
        if event.get('location') and len(event.get('location', '').split()) < 3:
            event = enhance_location_data(event)
        return jsonify(event)
    else:
        return ("Not found", 404)

@event_bp.route("/api/search", methods=["GET"])
def search_events():
    query = request.args.get("q", "").lower()
    
    if not query or len(query) < 2:
        return jsonify([])
    
    try:
        # Query to search for events matching the search term in title or description
        search_query = f"""
        SELECT c.id, c.title, c.description, c.location, c.date, c.source, c.image
        FROM c
        WHERE CONTAINS(LOWER(c.title), '{query}') 
           OR CONTAINS(LOWER(c.description), '{query}')
        """
        
        # Execute the query against the events container
        items = list(events_container.query_items(
            query=search_query, 
            enable_cross_partition_query=True
        ))
        
        # Limit to top 10 results
        results = items[:10]
        
        # Format results for the frontend
        formatted_results = []
        for item in results:
            formatted_results.append({
                "id": item["id"],
                "title": item["title"],
                "description": item["description"][:100] + "..." if len(item["description"]) > 100 else item["description"],
                "location": item["location"],
                "date": item["date"],
                "source": item["source"]
            })
        
        return jsonify(formatted_results)
    
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500

# Get the top 10 events specified by each city
@event_bp.route("/api/events-by-city", methods=["GET"])
def get_top_events_by_city():
    city = request.args.get("city", "")
    limit = 10

    try:
        if city == "":
            # No city specified = return top 10 globally by popularity
            query = "SELECT * FROM c"
        
        elif city.lower() == "other":
            # Any city that's NOT Hoboken or NYC
            query = """
            SELECT * FROM c
            WHERE NOT (c.city = 'Hoboken' OR c.city = 'New York City')
            """

        else:
            # Filter for a specific city
            query = f"""
            SELECT * FROM c
            WHERE c.city = '{city}'
            """

        items = list(events_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))

        # Sort by popularity
        sorted_items = sorted(items, key=safe_popularity, reverse=True)

        # Return top 10
        return jsonify(sorted_items[:limit])

    except Exception as e:
        print(f"Error fetching top events by city: {e}")
        return jsonify({"error": str(e)}), 500

# Helper function to convert popularity for an event into an int (originally a string)
def safe_popularity(e):
    try:
        return int(e.get("popularity", 0))
    except:
        return 0

def enhance_location_data(event):
    """
    Try to enhance location data by adding missing details
    like city, state or full address if available
    """
    location = event.get('location', '')
    if not location:
        return event
    
    # Don't modify already detailed locations
    if len(location.split()) >= 3 and (',' in location):
        return event
    
    try:
        # Check for specific venues first
        if 'Psycho Mike' in location:
            event['location'] = "Psycho Mike's, 125 Washington Street, Hoboken, NJ"
        # Then check for common location patterns
        elif 'Stevens Institute' in location or 'Stevens' in location:
            event['location'] = 'Stevens Institute of Technology, Castle Point Terrace, Hoboken, NJ'
        elif 'Hoboken Public Library' in location:
            event['location'] = 'Hoboken Public Library, 500 Park Avenue, Hoboken, NJ'
        elif 'Hoboken' in location and len(location.split()) < 3:
            event['location'] = f"{location}, Hoboken, NJ"
        elif 'Jersey City' in location and len(location.split()) < 3:
            event['location'] = f"{location}, Jersey City, NJ"
        elif 'New York' in location or 'NYC' in location:
            if len(location.split()) < 3:
                event['location'] = f"{location}, New York, NY"
        
        # Try geocoding if we have an API key set up
        google_api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if google_api_key and (len(location.split()) < 3 or ',' not in location):
            try:
                geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={location}&key={google_api_key}"
                response = requests.get(geocode_url, timeout=3)
                data = response.json()
                
                if data['status'] == 'OK' and len(data['results']) > 0:
                    formatted_address = data['results'][0]['formatted_address']
                    event['location'] = formatted_address
                    # Save the coordinates for future use
                    event['coordinates'] = {
                        'lat': data['results'][0]['geometry']['location']['lat'],
                        'lng': data['results'][0]['geometry']['location']['lng']
                    }
            except Exception as e:
                print(f"Geocoding error: {e}")
                
    except Exception as e:
        print(f"Error enhancing location: {e}")
    
    return event