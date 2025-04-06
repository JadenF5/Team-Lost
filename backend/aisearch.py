from flask import Blueprint, jsonify, request
from openai import AzureOpenAI

import dotenv
from db import events_container
import os
dotenv.load_dotenv()

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT2"],
    api_key=os.environ["AZURE_OPENAI_API_KEY2"],
    api_version="2024-12-01-preview",
)

aisearch_bp = Blueprint("aisearch", __name__)

@aisearch_bp.route("/api/query", methods=["GET"])
def fetch_event():
    usertext = request.args.get("usertext")
    
    if not usertext or len(usertext.strip()) < 2:
        return jsonify([])

    try:
        query = gen_sql_query(usertext)
        print(f"Generated SQL query: {query}")
        
        items = db_query(query)
        print(f"Query returned {len(items)} results")
        
        # Ensure each item has required fields
        for item in items:
            if "id" not in item:
                item["id"] = str(uuid.uuid4())
            if "title" not in item:
                item["title"] = "Untitled Event"
            if "description" not in item:
                item["description"] = "No description available"
        
        return jsonify(items)
    except Exception as e:
        print(f"Error in fetch_event: {e}")
        return jsonify([])


def gen_sql_query(usertext):
    prompt = f"""
    You are an SQL query generator and you generate SQL queries for an event database. 
    The schema of the database is as such where every entry has the following attributes: 
    id, source(is either "amny", "hobokengirl", "visitnj", "duclink", where ducklink are events specifically at Stevens Institute of Technology), title, description, date, location, image(link to image), URL(link to event listing), price, popularity(score out of 100 on how popular the event is to students attending Stevens Institute of Technology), attendance(expected attendance). 
    Only respond with an SQL query or respond with the string "ERROR" if there is any issue. 
    Always begin with "SELECT * FROM c" and format every attribute as "c.(attribute)". 
    Remove the semicolons at the end and make sure any strings ignore capitailzation.
    """
    try:
        completion = client.chat.completions.create(
            model=os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"],
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": usertext}],
        )

        content = completion.choices[0].message.content.strip()

        # Handle case where AI might wrap JSON in code blocks (```json ... ```)
        if content.startswith("```"):
            content = content.split("```")[1].strip("sql").strip()

        return content

    except Exception as e:
        print(f"[AI ERROR] Failed to generate detailed event data: {e}")
        # Fallback structure
        return f"SELECT * FROM c WHERE c.title LIKE %{usertext}%"

def db_query(sqlquery):
    try:
        # Make sure we're getting query part after FROM c
        if sqlquery.startswith("SELECT * FROM c"):
            query_part = sqlquery
        else:
            query_part = f"SELECT * FROM c {sqlquery}"
            
        items = list(events_container.query_items(query=query_part, enable_cross_partition_query=True))
        # Return top 10 results
        return items[:10] if items else []
    except Exception as e:
        print(f"Error in db_query: {e}")
        return []