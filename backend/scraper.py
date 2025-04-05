from playwright.sync_api import sync_playwright
import requests
import os
from db import insert_event
import re


# Cleaning text for HobokenGirl
def clean_text(text):
    if not isinstance(text, str):
        return "Untitled Event"
    text = text.replace("\xa0", " ")  # Remove non-breaking spaces
    text = re.sub(r"[\n\t]+", " ", text)  # Replace \n and \t with space
    text = re.sub(r"\s{2,}", " ", text)  # Collapse multiple spaces
    return text.strip()


# Getting date and location for HobokenGirl
def extract_date_and_location(text):
    date_match = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}", text)
    location_match = re.search(r"(\d{2,5} [\w\s\.,'-]+, (Hoboken|Jersey City|Edgewater|New York|NYC))$", text)


    return {
        "date": date_match.group(0) if date_match else None,
        "location": location_match.group(0) if location_match else None
    }


# Getting clean description for HobokenGirl
def build_clean_description(title, location):
    if not title or not location:
        return title or "Event"


    # Try to extract venue name from location (before the street address)
    venue = location.split(" ")[0:5]  # Take up to 5 words before the address
    venue_name = " ".join(venue).strip()


    # If the venue appears in the title, don't repeat it
    if venue_name.lower() in title.lower():
        return title
    return f"{title} at {location}"




# Function that scrapes events from HobokenGirl
def scrape_hoboken():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.hobokengirl.com/events/", timeout=60000)
        page.wait_for_selector("article.tribe-events-calendar-month-mobile-events__mobile-event", timeout=15000, state="attached")
        event_cards = page.query_selector_all("article.tribe-events-calendar-month-mobile-events__mobile-event")
        event_data = []


        for card in event_cards:
            title_el = card.query_selector("h3")
            date_el = card.query_selector("time.tribe-events-calendar-list__event-datetime")
            location_el = card.query_selector("address")
            img_el = card.query_selector("img")


            title = clean_text(title_el.inner_text()) if title_el else None
            date = clean_text(date_el.inner_text()) if date_el else None
            location = clean_text(location_el.inner_text()) if location_el else None
            image_url = img_el.get_attribute("src") if img_el else None


            description = build_clean_description(title, location)


            event_data.append({
                "title": title,
                "date": date,
                "location": location,
                "description": description,
                "image": image_url
            })


        browser.close()
        return event_data


# Function that scrapes events from DuckLink (Stevens student orgs/events)
def scrape_ducklink():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://ducklink.stevens.edu/events", timeout=60000)


        # Wait for listing elements to be in the DOM
        page.wait_for_selector("div.listing-element", timeout=15000, state="attached")
        page.wait_for_timeout(2000)


        # Infinite scroll logic
        previous_height = 0
        while True:
            current_height = page.evaluate("() => document.body.scrollHeight")
            if current_height == previous_height:
                break
            previous_height = current_height
            page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1500)


        event_cards = page.query_selector_all("div.listing-element")
        print(f"Found {len(event_cards)} event cards on DuckLink.")
        event_data = []


        for card in event_cards:
            # Extract title and clean it up
            title_el = card.query_selector("h3.media-heading.header-cg--h4")
            title = clean_text(title_el.text_content()) if title_el else "Untitled Event"


            # Remove extraneous tags like TODAY, TOMORROW, LIVE, etc.
            title = re.sub(r"\b(TODAY|TOMORROW|LIVE|HYBRID|CHECKED IN|NO SHOW|WAITING LIST)\b", "", title, flags=re.IGNORECASE).strip()
           
            # Skip events that appear to be placeholders or broken templates
            if ("[eventName]" in title or "[eventBadges]" in title or
                "Hybrid Registered" in title or "CHECKED IN" in title or "WAITING LIST" in title):
                continue


            # Extract description (from aria-label) and check for junk placeholders
            description = clean_text(card.get_attribute("aria-label")) if card.get_attribute("aria-label") else title
            if "[eventBadges]" in description:
                continue


            # Extract date; if missing, skip this event
            aria_label = card.get_attribute("aria-label") or ""
            date_match = re.search(r"\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? (\d{2} \w+ \d{4})", aria_label)
            date = date_match.group(1) if date_match else None


            # Use a default location (DuckLink events currently don't display a location)
            location = "Stevens Institute of Technology"


            # Extract image and event link
            image_el = card.query_selector("div.listing-element__preimg-block img")
            link_el = card.query_selector("div.listing-element__preimg-block a")
            image_url = image_el.get_attribute("src") if image_el else None
            if image_url and image_url.startswith("/"):
                image_url = f"https://ducklink.stevens.edu{image_url}"


            link_suffix = link_el.get_attribute("href") if link_el else None
            event_url = f"https://ducklink.stevens.edu{link_suffix}" if link_suffix else None


            # Build a clean description (e.g., "Movie Night at Stevens Institute of Technology")
            description = build_clean_description(title, location)


            event_data.append({
                "title": title,
                "date": date,
                "location": location,
                "description": description,
                "image": image_url,
                "url": event_url
            })


        browser.close()
        return event_data




# Function that scrapes events from visitnj.com
def scrape_visitnjdotcom():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False) ## Note This is FALSE so we can manually get rid of the popup
        page = browser.new_page()
        page.goto("https://visitnj.org/nj/events", timeout=90000, wait_until="domcontentloaded")


        # Close popup if it appears
        try:
            page.wait_for_selector("div[class*='modal']", timeout=5000)
            close_btn = page.query_selector("a.close, button[class*='modal-close']")
            if close_btn:
                close_btn.click()
                page.wait_for_selector("div[class*='modal']", state="detached", timeout=5000)
                print("Popup closed.")
        except:
            print("No popup found.")


        page.wait_for_timeout(3000)
        event_data = []
        max_pages = 10
        current_page = 1


        while current_page <= max_pages:
            print(f"Scraping page {current_page}...")
            page.wait_for_selector("div.inner-wrapper", timeout=10000)
            cards = page.query_selector_all("div.inner-wrapper")


            for card in cards:
                # Title and URL
                link = card.query_selector("a.grid-photo.target-checked")
                title = clean_text(link.get_attribute("title")) if link else "Untitled Event"
                url = link.get_attribute("href") if link else None
                if not url or "/user/login" in url:
                    continue
                if url.startswith("/"):
                    url = f"https://visitnj.org{url}"


                # Date
                date_el = card.query_selector("div.date")
                date = clean_text(date_el.inner_text()) if date_el else None


                # Image (now correctly from nested photo container div)
                photo_div = card.query_selector("div.grid-photo-container")
                image_url = photo_div.get_attribute("data-img") if photo_div else None
                if image_url and image_url.startswith("/"):
                    image_url = f"https://visitnj.org{image_url}"

                street = card.query_selector("span.streetAddress")
                city = card.query_selector("span.city")
                state = card.query_selector("span.state")

                street_text = clean_text(street.inner_text()) if street else ""
                city_text = clean_text(city.inner_text()) if city else ""
                state_text = clean_text(state.inner_text()) if state else ""

                full_location = ", ".join(filter(None, [street_text, city_text, state_text]))

                event_data.append({
                    "title": title,
                    "date": date,
                    "location": full_location,
                    "description": f"{title} at {full_location}",
                    "image": image_url,
                    "url": url
                })


            # Pagination logic
            next_button = page.query_selector("a[title='Go to next page']")
            if next_button:
                try:
                    next_button.click()
                    page.wait_for_timeout(3000)
                    current_page += 1
                except:
                    print("Error clicking next button.")
                    break
            else:
                break


        browser.close()
        return event_data

# Used to scrape NYC events
def scrape_nyc():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        base_url = "https://events.amny.com/?tribe_paged="
        event_data = []
        max_pages = 30


        for current_page in range(1, max_pages + 1):
            print(f"Scraping AMNY page {current_page}")
            page.goto(f"{base_url}{current_page}", timeout=60000)
            try:
                page.wait_for_selector("div[id^='post-']", timeout=10000)
            except:
                page.screenshot(path=f"amny_error_page_{current_page}.png", full_page=True)
                print(f"Failed to load page {current_page}, screenshot saved.")
                continue


            cards = page.query_selector_all("div[id^='post-']")
            for card in cards:
                try:
                    link_el = card.query_selector("a.tribe-event-url")
                    title = clean_text(link_el.inner_text()) if link_el else "Untitled Event"
                    url = link_el.get_attribute("href") if link_el else None


                    # Date from hidden HTML comment block
                    raw_html = card.inner_html()
                    start_time_match = re.search(r"start_time\D+(\d{4}-\d{2}-\d{2})", raw_html)
                    date = start_time_match.group(1) if start_time_match else None


                    # Location from nearby element (fallback to borough)
                    location_el = card.query_selector("div.tribe-events-event-meta")
                    location = clean_text(location_el.inner_text()) if location_el else "New York City"
                    location = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", location)


                    # Extract <img> src inside <a class="magma-event-thumbnail">
                    thumb_anchor = card.query_selector("a.magma-event-thumbnail")
                    thumb_img = thumb_anchor.query_selector("img") if thumb_anchor else None
                    image_url = thumb_img.get_attribute("src") if thumb_img else None


                    description = f"{title} in {location}"


                    event_data.append({
                        "title": title,
                        "date": date,
                        "location": location,
                        "description": description,
                        "image": image_url,
                        "url": url
                    })


                except Exception as e:
                    print(f"Failed to parse card: {e}")
                    continue


        browser.close()
        return event_data








# Function that applies AI filters to each website
import uuid
# This works for HobokenGirl Data
def ai_filter_events(raw_data, source):
    structured = []
    for event in raw_data:
        title = event.get("title") or "Untitled Event"
        date = event.get("date")
        location = event.get("location")
        description = event.get("description") or f"{title} at {location}"
        image = event.get("image")


        event_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{title}{date}{location}"))


        structured.append({
            "id": event_id,
            "title": title,
            "description": description,
            "source": source,
            "date": date,
            "location": location,
            "image": image
        })
    return structured


# This works for ducklink
def ai_filter_events_ducklink(raw_data):
    structured = []
    for event in raw_data:
        title = event.get("title") or "Untitled Event"
        date = event.get("date")
        location = event.get("location") or "Stevens Institute of Technology"
        description = event.get("description") or title
        image = event.get("image")
        url = event.get("url")


        # Unique ID based on multiple fields
        event_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{title}{date}{location}ducklink"))


        structured.append({
            "id": event_id,
            "title": title,
            "description": description,
            "source": "ducklink",
            "date": date,
            "location": location,
            "image": image,
            "url": url
        })
    return structured


# This forks for visitnj
def ai_filter_events_visitnj(raw_data):
    structured = []
    for event in raw_data:
        title = event.get("title") or "Untitled Event"
        date = event.get("date")
        location = event.get("location") or "New Jersey"
        description = event.get("description") or f"{title} at {location}"
        image = event.get("image")
        url = event.get("url")


        # Unique ID based on event fields
        event_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{title}{date}{location}visitnj"))


        structured.append({
            "id": event_id,
            "title": title,
            "description": description,
            "source": "visitnj",
            "date": date,
            "location": location,
            "image": image,
            "url": url
        })
    return structured


def ai_filter_events_nyc(raw_data):
    structured = []
    for event in raw_data:
        title = event.get("title") or "Untitled Event"
        date = event.get("date")
        location = event.get("location") or "New York City"
        description = event.get("description") or f"{title} in {location}"
        image = event.get("image")
        url = event.get("url")


        event_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{title}{date}{location}amny"))


        structured.append({
            "id": event_id,
            "title": title,
            "description": description,
            "source": "amny",
            "date": date,
            "location": location,
            "image": image,
            "url": url
        })
    return structured


def main():
    raw_events = {
        # "hobokengirl": scrape_hoboken(), # COMPLETE
        # "ducklink": scrape_ducklink(), # COMPLETE
        "visitnj": scrape_visitnjdotcom(), # COMPLETED
        # "nyc": scrape_nyc(), COMPLETED
    }

    for source, events in raw_events.items():
        print(f"\n========== {source.upper()} ==========")
        # Route to different AI filter logic based on source
        if source == "ducklink":
            structured = ai_filter_events_ducklink(events)
        elif source == "visitnj":
            structured = ai_filter_events_visitnj(events)
        elif source == "nyc":
            structured = ai_filter_events_nyc(events)
        else:
            structured = ai_filter_events(events, source)
        for event in structured:
            print(event)
            insert_event(event)
            print("-----------------------------------")


if __name__ == "__main__":
    main()
