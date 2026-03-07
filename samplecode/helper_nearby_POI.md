Helper Function: Fetch Nearby Points of Interest (Finnish)
1. Overview
This function fetches nearby points of interest (e.g., restaurants, schools, hospitals) for a given listing location and returns them in Finnish. The results are formatted for display on the listing page, enhancing the user experience for Finnish buyers.

2. Prerequisites

Google Places API (New): Enabled in your Google Cloud project.
API Key: Stored securely in Google Secret Manager.
Language: Finnish (fi).

3. Function Signature
python
Copy

def fetch_nearby_pois(latitude: float, longitude: float, radius: int = 1000) -> list[dict]:
    """
    Fetches nearby points of interest in Finnish for a given location.

    Args:
        latitude (float): Latitude of the listing.
        longitude (float): Longitude of the listing.
        radius (int): Search radius in meters (default: 1000).

    Returns:
        list[dict]: A list of nearby POIs, each with name, address, type, and distance.
    """


4. Input Parameters


  
    
      Parameter
      Type
      Description
      Example Value
    
  
  
    
      latitude
      float
      Latitude of the listing location.
      37.983810
    
    
      longitude
      float
      Longitude of the listing location.
      23.727539
    
    
      radius
      int
      Search radius in meters.
      1000
    
  



5. Output Structure
The function returns a list of dictionaries, each representing a POI:
python
Copy

[
    {
        "name": "Ravintola Parthenon",
        "address": "Ateenan kaupunki, Kreikka",
        "type": "restaurant",
        "distance": "500 m",
        "location": {"lat": 37.9716, "lng": 23.7250}
    },
    {
        "name": "Ateenan yleissairaala",
        "address": "Ateenan kaupunki, Kreikka",
        "type": "hospital",
        "distance": "800 m",
        "location": {"lat": 37.9750, "lng": 23.7300}
    }
]


6. Implementation Steps
6.1 Fetch the API Key
python
Copy

from google.cloud import secretmanager

def fetch_secret(secret_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    secret_name = f"projects/[PROJECT_ID]/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": secret_name})
    return response.payload.data.decode("UTF-8")

PLACES_API_KEY = fetch_secret("PLACES_API_KEY")


6.2 Call the Google Places API (New)
python
Copy

import requests

def fetch_nearby_pois(latitude: float, longitude: float, radius: int = 1000) -> list[dict]:
    url = "https://places.googleapis.com/v1/places:searchNearby"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.location"
    }
    payload = {
        "location": {"latitude": latitude, "longitude": longitude},
        "radius": radius,
        "language": "fi",
        "maxResultCount": 10,
        "rankPreference": "DISTANCE"
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    pois = []
    for place in data.get("places", []):
        pois.append({
            "name": place["displayName"]["text"],
            "address": place.get("formattedAddress", "Osoite ei saatavilla"),
            "type": place["types"][0] if place["types"] else "tuntematon",
            "location": {"lat": place["location"]["latitude"], "lng": place["location"]["longitude"]}
        })

    return pois


6.3 Calculate Distance (Optional)
If you want to display the distance from the listing:
python
Copy

from geopy.distance import geodesic

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> str:
    distance = geodesic((lat1, lng1), (lat2, lng2)).meters
    return f"{round(distance)} m" if distance < 1000 else f"{round(distance / 1000, 1)} km"

# Update the pois list in the function:
for poi in pois:
    poi["distance"] = calculate_distance(latitude, longitude, poi["location"]["lat"], poi["location"]["lng"])


7. Error Handling

API Errors: Log and handle HTTP errors (e.g., rate limits, invalid requests).
Missing Data: Provide fallback values for missing fields (e.g., "Osoite ei saatavilla" for missing addresses).

8. Example Usage
python
Copy

pois = fetch_nearby_pois(latitude=37.983810, longitude=23.727539, radius=1000)
for poi in pois:
    print(f"{poi['name']} ({poi['type']}): {poi['address']} ({poi['distance']})")


9. Integration with Listing Page

Frontend: Display the POIs in a "Nearby Amenities" section on the listing page.
Icons: Use icons for different POI types (e.g., 🏥 for hospitals, 🍽️ for restaurants).

10. Caching (Optional)

Cache results for 24 hours to reduce API calls and improve performance.

11. Deployment

Deploy as part of your backend service (e.g., Cloud Run, Cloud Functions).
