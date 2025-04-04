from playwright.sync_api import sync_playwright
import requests
import os


# Function that scrapes events from HobokenGirl
def scrape_hoboken():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.hobokengirl.com/events/", timeout=60000)
        events = page.query_selector_all(".tribe-events-calendar-list__event")
        data = [e.inner_text() for e in events]
        browser.close()
        return data


# Function that scrapes events from DuckLink (Stevens student orgs/events)
def scrape_ducklink():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://ducklink.stevens.edu/")  
        page.wait_for_timeout(5000)
        events = page.query_selector_all("div.event-item")  
        data = [e.inner_text() for e in events]
        browser.close()
        return data


# Function that scrapes events from NJ.com local event listings
def scrape_njdotcom():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.nj.com/events/", timeout=60000)
        page.wait_for_timeout(5000)
        events = page.query_selector_all("div.event")  
        data = [e.inner_text() for e in events]
        browser.close()
        return data


# Function that fetches events from NYC Open Data Events API
def fetch_nyc_events(borough=None, zip_code=None):
    url = "https://data.cityofnewyork.us/resource/tg4x-b46p.json"
    params = {}

    if borough:
        params["borough"] = borough
    if zip_code:
        params["zip"] = zip_code

    response = requests.get(url, params=params)
    return response.json()


# Function that fetches events from the Eventbrite API using location and radius
def fetch_eventbrite_events(location="Hoboken, NJ", radius="10mi"):
    token = os.getenv("EVENTBRITE_TOKEN")
    if not token:
        raise Exception("Missing EVENTBRITE_TOKEN in environment variables")

    url = "https://www.eventbriteapi.com/v3/events/search/"
    headers = { "Authorization": f"Bearer {token}" }
    params = {
        "location.address": location,
        "location.within": radius,
        "expand": "venue"
    }

    response = requests.get(url, headers=headers, params=params)
    return response.json().get("events", [])


# Function that fetches events from the Meetup API using lat/lon and radius
def fetch_meetup_events(lat=40.7440, lon=-74.0324, radius=10):
    token = os.getenv("MEETUP_API_KEY")
    if not token:
        raise Exception("Missing MEETUP_API_KEY in environment variables")

    url = (
        f"https://api.meetup.com/find/upcoming_events"
        f"?key={token}&sign=true&photo-host=public"
        f"&lon={lon}&lat={lat}&radius={radius}"
    )

    response = requests.get(url)
    return response.json().get("events", [])


# Function that applies AI filters and structuring to raw event data (to be implemented later)
def ai_filter_events(raw_data):
    return


# Function that adds structured event data to the database (to be implemented later)
def add_to_database(structured_data):
    return

def main():
    raw_events = {
        "hobokengirl": scrape_hoboken(),
        "ducklink": scrape_ducklink(),
        "nj.com": scrape_njdotcom(),
        "nyc_api": fetch_nyc_events(),
        "eventbrite": fetch_eventbrite_events(),
        "meetup": fetch_meetup_events()
    }

    for source, events in raw_events.items():
        print(f"\n========== {source.upper()} ==========")
        for event in events:
            print(event)
            print("-----------------------------------")

if __name__ == "__main__":
    main()