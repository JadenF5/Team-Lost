import os
from openai import AzureOpenAI
import json

deployment = "o3-mini"
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT2"],
    api_key=os.environ["AZURE_OPENAI_API_KEY2"],
    api_version="2024-12-01-preview",
)
system_prompt = (
    "You are a semantic query parser for an event search engine. "
    "Given a natural language query, extract and return a JSON object with:\n"
    "- 'core_query': the main topic (exclude date/location phrases)\n"
    "- 'city': the city or location mentioned, or null if none\n"
    "- 'start_date' and 'end_date': ISO 8601 date range if time info is mentioned, or null\n"
    "- 'tags' : a string of 5 strings that are semantically similar to the core query, seperated by spaces\n"
    "Respond only with JSON."
)
def preprocess_query(user_query):
    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_query,
            }
        ],
        max_completion_tokens=100000,
        model=deployment
    )
    content = response.choices[0].message.content.strip()
    # Handle case where AI might wrap JSON in code blocks (```json ... ```)
    if content.startswith("```"):
        content = content.split("```")[1].strip("json").strip()
    print("PREPROCESSED JSON: " + content)
    return json.loads(content)
