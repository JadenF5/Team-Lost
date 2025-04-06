import os
import json
import uuid
from dotenv import load_dotenv
from azure.cosmos import CosmosClient, PartitionKey
from openai import AzureOpenAI
from db import events_container, container as users_container, filtered_events_container as filtered_container



# Load environment variables from .env
load_dotenv()

# Cosmos DB setup


# OpenAI client using filter AI keys
ai_client = AzureOpenAI(
    azure_endpoint=os.environ["filter_azure_openAI_endpoint"],
    api_key=os.environ["filter_azure_openAI_key"],
    api_version="2024-12-01-preview",
)

# AI matching function
def generate_ai_match(event, user):
    prompt = f"""
    For the following user and event, generate a JSON response with:

    - "score": A number from 1 to 100 based on how well the event matches the user's preferences (consider categories, interests, budget, location, etc.).
    - "reason": Write a short, friendly explanation that feels like a personal recommendation. Use warm and engaging language.

    Include:
    - Why this event fits the user's interests.
    - Highlight what’s exciting or unique about the event.
    - If the user typically doesn't prefer this kind of event, acknowledge that gently (e.g., "Although this isn’t usually your thing...").
    - If the price slightly exceeds their budget, mention it casually but positively (e.g., "It's a bit above your budget, but might still be worth it for the experience.").
    - If the event is *way outside* their preferences (budget or interests), reflect that in both the score and reason.

    - Include all original fields from the event unchanged (do NOT rename or modify any event fields).

    - Add `"user_id"` using the user's `id` value.
    - Add `"id"` by concatenating the user_id and the event's id with an underscore.

    Respond only with the final JSON object. Do not include markdown, explanations, or any extra commentary.


    User Preferences:
    {json.dumps(user['preferences'], indent=2)}

    Event:
    {json.dumps(event, indent=2)}
    """
    try:
        completion = ai_client.chat.completions.create(
            model=os.environ["filter_azure_openAI_deployment_name"],
            messages=[{"role": "user", "content": prompt}],
        )
        content = completion.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.split("```")[1].strip("json").strip()

        return json.loads(content)
    except Exception as e:
        print(f"[AI ERROR] Failed to score event:\n{e}")
        return None
def run_for_user(user_id):
    # Get the user
    try:
        user = users_container.read_item(item=user_id, partition_key=user_id)
    except Exception as e:
        print(f"[ERROR] User not found: {e}")
        return

    if not user.get("preferences") or user["preferences"] == "Null":
        print(f"[SKIP] User {user_id} is missing preferences.")
        return

    # Get all events
    events = list(events_container.query_items(
        query="SELECT * FROM c",
        enable_cross_partition_query=True
    ))

    # Get existing filtered events for this user
    existing_ids = set()
    existing_matches = filtered_container.query_items(
        query="SELECT c.id FROM c WHERE c.user_id=@user_id",
        parameters=[{"name": "@user_id", "value": user_id}],
        enable_cross_partition_query=True
    )
    for item in existing_matches:
        if "id" in item:
            existing_ids.add(item["id"].split("_")[1])  # get just the event ID

    print(f"\nScoring events for user: {user_id}")
    for event in events:
        event_id = event.get("id")
        if not event_id or event_id in existing_ids:
            print(f"⏩ Skipping event {event_id} (already processed)")
            continue

        match_result = generate_ai_match(event, user)
        if match_result:
            try:
                match_result["user_id"] = user_id
                match_result["id"] = f"{user_id}_{event_id}"
                filtered_container.upsert_item(match_result)
                print(f"✅ Scored event '{event.get('title', 'Unknown')}' to {match_result['score']}% for user: {user_id}")
            except Exception as e:
                print(f"[DB ERROR] Could not insert result: {e}")
