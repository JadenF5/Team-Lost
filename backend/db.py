from azure.cosmos import CosmosClient, PartitionKey


import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("COSMOS_URL")
key = os.getenv("COSMOS_KEY")

database_name = "HackathonDB"
container_name = "Users"

client = CosmosClient(url, credential=key)

database = client.create_database_if_not_exists(id=database_name)
container = database.create_container_if_not_exists(
    id=container_name,
    partition_key=PartitionKey(path="/email"),
)
