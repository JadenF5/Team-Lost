from azure.cosmos import CosmosClient, PartitionKey
import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("COSMOS_URL")
key = os.getenv("COSMOS_KEY")

database_name = "HackathonDB"
container_name = "Users"
events_container_name = "Events"
client = CosmosClient(url, credential=key)

database = client.create_database_if_not_exists(id=database_name)
container = database.create_container_if_not_exists(
    id=container_name,
    partition_key=PartitionKey(path="/email"),
)

events_container = database.create_container_if_not_exists(
    id = events_container_name,
    partition_key=PartitionKey(path='/source'),
)

def insert_event(event_data):
    try:
        events_container.upsert_item(event_data)
    except Exception as e:
        print(f"Error inserting event: {e}")

# Get an event by its EventID
def get_event_w_id(event_id):
    try:
        query = f"SELECT * FROM c WHERE c.id = '{event_id}'"
        items = list(events_container.query_items(query=query, enable_cross_partition_query=True))
        if items:
            return items[0]
        else:
            None
    except Exception as e:
        print(f"Error fetching event by ID: {e}")
