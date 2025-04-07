from flask import Blueprint, jsonify, request
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from preprocessor import preprocess_query

import dotenv
import os
import uuid
import traceback
import logging

dotenv.load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Output to console
        logging.FileHandler('aisearch.log', encoding='utf-8')  # Output to file
    ]
)
logger = logging.getLogger(__name__)

# Azure AI Search configuration
try:
    search_endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT")
    search_key = os.environ.get("AZURE_SEARCH_KEY")
    search_index_name = os.environ.get("AZURE_SEARCH_INDEX_NAME")

    logger.info(f"Initializing Search Client:")
    logger.info(f"Endpoint: {search_endpoint}")
    logger.info(f"Index Name: {search_index_name}")
    logger.info(f"Key Provided: {'Yes' if search_key else 'No'}")

    search_client = SearchClient(
        endpoint=search_endpoint,
        index_name=search_index_name,
        credential=AzureKeyCredential(search_key)
    )
    logger.info("Search Client initialized successfully")

except Exception as e:
    logger.error(f"Search Client initialization error: {e}")
    search_client = None

# Initialize the search client with more robust error handling
search_client = None
try:
    if all([search_endpoint, search_key, search_index_name]):
        search_client = SearchClient(
            endpoint=search_endpoint,
            index_name=search_index_name,
            credential=AzureKeyCredential(search_key)
        )
        logger.info(f"Successfully initialized SearchClient for index: {search_index_name}")
    else:
        logger.error("Missing required Azure Search configuration")
except Exception as init_error:
    logger.error(f"ERROR initializing SearchClient: {init_error}")
    logger.error(traceback.format_exc())

aisearch_bp = Blueprint("aisearch", __name__)

def safe_search(search_text, top=20):
    """
    Perform a safe search with error handling and logging
    """
    if not search_client:
        logger.error("Search client not initialized")
        return []

    try:
        logger.debug(f"Performing search for: {search_text}")
        
        # Use a wildcard search if text is empty or too short
        if not search_text or len(search_text.strip()) < 2:
            search_text = '*'
        else:
            processed = preprocess_query(search_text)
            if processed["core_query"]:
                search_text = processed["core_query"] + " " + processed["tags"]
            elif processed["city"]:
                search_text = processed["city"]
                
        results = search_client.search(
            search_text=search_text,
            select=[
                "id", "title", "description", "date", 
                "location", "image", "url", "price", 
                "popularity", "attendance", "source", "city"
            ],
            top=top,
            search_mode="any",  # More flexible matching
            query_type="full"  # Use full text search
        )
        
        # Convert results to a list of dictionaries
        items = []
        for result in results:
            item = dict(result)
            
            # Ensure each item has required fields
            item['id'] = item.get('id', str(uuid.uuid4()))
            item['title'] = item.get('title', 'Untitled Event')
            item['description'] = item.get('description', 'No description available')
            
            items.append(item)
        
        logger.info(f"Search for '{search_text}' returned {len(items)} results")
        return items
    
    except Exception as e:
        logger.error(f"Search error for '{search_text}': {e}")
        logger.error(traceback.format_exc())
        return []

@aisearch_bp.route("/api/search-proxy", methods=["POST"])
def search_proxy():
    """
    Proxy endpoint for more flexible search via POST
    """
    try:
        # Log full request details for debugging
        logger.debug(f"Received request headers: {request.headers}")
        logger.debug(f"Received request data: {request.get_data()}")

        # Get search parameters from the request
        data = request.json or {}
        search_text = data.get("search_text", "*")
        
        logger.debug(f"Extracted search text: {search_text}")

        # Perform search
        items = safe_search(search_text)
        
        logger.info(f"Returning {len(items)} search results")
        return jsonify(items)
        
    except Exception as e:
        logger.error(f"Error in search_proxy: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "details": {
                "search_text": search_text if 'search_text' in locals() else 'N/A',
                "endpoint": search_endpoint,
                "index_name": search_index_name
            }
        }), 500

@aisearch_bp.route("/api/query", methods=["GET"])
def fetch_event():
    """
    GET endpoint for fetching events with a query parameter
    """
    usertext = request.args.get("usertext", "").strip()
    
    if not usertext or len(usertext) < 2:
        logger.debug("Empty or too short search query")
        return jsonify([])

    try:
        # Log search parameters
        logger.debug(f"Searching with parameters:")
        logger.debug(f"Search Text: {usertext}")
        logger.debug(f"Endpoint: {search_endpoint}")
        logger.debug(f"Index: {search_index_name}")

        # Perform search
        items = safe_search(usertext)
        
        return jsonify(items)
    
    except Exception as e:
        logger.error(f"Error in fetch_event: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "details": {
                "search_text": usertext,
                "endpoint": search_endpoint,
                "index_name": search_index_name
            }
        }), 500

@aisearch_bp.route("/api/search-with-filters", methods=["GET"])
def search_with_filters():
    """
    Advanced search endpoint that supports filtering by various criteria
    """
    usertext = request.args.get("usertext", "")
    source = request.args.get("source")
    city = request.args.get("city")
    min_popularity = request.args.get("min_popularity")
    sort_by = request.args.get("sort_by", "relevance")  # Default to relevance sorting
    
    # Build filter string if any filters are specified
    filter_conditions = []
    if source:
        filter_conditions.append(f"source eq '{source}'")
    if city:
        filter_conditions.append(f"city eq '{city}'")
    if min_popularity and min_popularity.isdigit():
        filter_conditions.append(f"popularity ge {min_popularity}")
    
    filter_string = " and ".join(filter_conditions) if filter_conditions else None
    
    # Determine sort order
    if sort_by == "date":
        order_by = "date desc"
    elif sort_by == "popularity":
        order_by = "popularity desc"
    else:
        order_by = None  # Use default relevance sorting
    
    try:
        # If there's no search text but there are filters, use "*" to match all documents
        search_text = usertext if usertext else "*"
        
        # Log search parameters
        logger.debug(f"Filtered search:")
        logger.debug(f"Search Text: {search_text}")
        logger.debug(f"Filters: {filter_string}")
        logger.debug(f"Sort By: {sort_by}")
        
        # Execute search with filters
        results = search_client.search(
            search_text=search_text,
            filter=filter_string,
            order_by=order_by,
            select=[
                "id", "title", "description", "date", 
                "location", "image", "url", "price", 
                "popularity", "attendance", "source", "city"
            ],
            highlight="title,description",
            highlight_pre_tag="<b>",
            highlight_post_tag="</b>",
            top=20
        )
        
        # Process results
        items = [dict(result) for result in results]
        
        logger.info(f"Filtered search returned {len(items)} results")
        return jsonify(items)
    except Exception as e:
        logger.error(f"Error in search_with_filters: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@aisearch_bp.route("/api/get-facets", methods=["GET"])
def get_facets():
    """
    Get facet values for filtering options (sources, cities, etc.)
    """
    try:
        # Use a wildcard query to get facets from all documents
        results = search_client.search(
            search_text="*",
            facets=["source", "city"],
            top=0  # We only need facets, not actual results
        )
        
        # Extract facet information
        facets = {}
        for facet_name, facet_values in results.get_facets().items():
            facets[facet_name] = [{"value": f.value, "count": f.count} for f in facet_values]
        
        return jsonify(facets)
    except Exception as e:
        logger.error(f"Error in get_facets: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500