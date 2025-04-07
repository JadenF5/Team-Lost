document.addEventListener("DOMContentLoaded", async function () {
    const searchBar = document.getElementById("search-bar");
    const searchButton = document.getElementById("search-button");
    const mainSearchBar = document.getElementById("main-search-bar");
    let aiSearchResults = null;
    let recommendedEventsInterval = null;

    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (!userSession) {
        window.location.href = "index.html";
        return;
    }

    const userNameElement = document.getElementById("user-name");
    if (userNameElement && userSession.name) {
        userNameElement.textContent = `Welcome, ${userSession.name}`;
    } else if (userNameElement && userSession.username) {
        // Fallback to username if name is not available
        userNameElement.textContent = `Welcome, ${userSession.username}`;
    } else if (userNameElement && userSession.email) {
        // Last resort fallback to email
        userNameElement.textContent = `Welcome, ${
            userSession.email.split("@")[0]
        }`;
    }

    // Store recommended events in localStorage
    function storeRecommendedEvents(events) {
        if (events && events.length > 0) {
            const userSession = JSON.parse(localStorage.getItem("userSession"));
            if (userSession && userSession.email) {
                localStorage.setItem(
                    `recommendedEvents_${userSession.email}`,
                    JSON.stringify(events)
                );
                localStorage.setItem(
                    `recommendedEventsTime_${userSession.email}`,
                    Date.now()
                );
            }
        }
    }

    // Load recommended events from localStorage if they exist and are recent
    function loadRecommendedEvents() {
        const userSession = JSON.parse(localStorage.getItem("userSession"));
        if (!userSession || !userSession.email) return null;

        const storedEvents = localStorage.getItem(
            `recommendedEvents_${userSession.email}`
        );
        const storedTime = localStorage.getItem(
            `recommendedEventsTime_${userSession.email}`
        );

        // Only use stored events if they're less than 30 minutes old
        if (
            storedEvents &&
            storedTime &&
            Date.now() - storedTime < 30 * 60 * 1000
        ) {
            return JSON.parse(storedEvents);
        }
        return null;
    }

    // Store search results in localStorage
    function storeSearchResults(query, results) {
        if (results && results.length > 0) {
            const userSession = JSON.parse(localStorage.getItem("userSession"));
            const userKey =
                userSession && userSession.email ? userSession.email : "guest";

            const searchData = {
                query: query,
                results: results,
                timestamp: Date.now(),
            };

            localStorage.setItem(
                `lastSearchResults_${userKey}`,
                JSON.stringify(searchData)
            );
        }
    }

    // Check if we have recent search results when the page loads
    function checkForStoredSearchResults() {
        const userSession = JSON.parse(localStorage.getItem("userSession"));
        const userKey =
            userSession && userSession.email ? userSession.email : "guest";

        const storedSearch = localStorage.getItem(
            `lastSearchResults_${userKey}`
        );
        if (storedSearch) {
            const searchData = JSON.parse(storedSearch);
            // Only use if less than 1 hour old
            if (Date.now() - searchData.timestamp < 60 * 60 * 1000) {
                createSearchResultsSection(
                    searchData.query,
                    searchData.results
                );
                return true;
            }
        }
        return false;
    }

    // Handle logout
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            const userSession = JSON.parse(localStorage.getItem("userSession"));
            if (userSession && userSession.email) {
                // Clear user-specific data
                localStorage.removeItem(
                    `lastSearchResults_${userSession.email}`
                );
                localStorage.removeItem(
                    `recommendedEvents_${userSession.email}`
                );
                localStorage.removeItem(
                    `recommendedEventsTime_${userSession.email}`
                );
            }

            localStorage.removeItem("userSession");
            window.location.href = "index.html";
        });
    }

    const leftArrows = document.querySelectorAll(".slider-arrow.left");
    const rightArrows = document.querySelectorAll(".slider-arrow.right");
    const eventRows = document.querySelectorAll(".event-row");

    leftArrows.forEach((arrow) => {
        arrow.addEventListener("click", function () {
            const row = this.nextElementSibling;
            if (!row || !row.querySelector(".event-card")) return;

            const cardWidth = row.querySelector(".event-card").offsetWidth + 20;
            row.scrollBy({
                left: -cardWidth * 1,
                behavior: "smooth",
            });
        });
    });

    rightArrows.forEach((arrow) => {
        arrow.addEventListener("click", function () {
            const row = this.previousElementSibling;
            if (!row || !row.querySelector(".event-card")) return;

            const cardWidth = row.querySelector(".event-card").offsetWidth + 20;
            row.scrollBy({
                left: cardWidth * 1,
                behavior: "smooth",
            });
        });
    });

    // Create search results dropdown container
    const searchContainer = document.querySelector(".search-container");

    // Create and append the dropdown element
    const searchDropdown = document.createElement("div");
    searchDropdown.className = "search-results-dropdown";
    searchDropdown.style.display = "none";
    searchContainer.appendChild(searchDropdown);

    // Track if we should close dropdown on document click
    let allowDropdownClose = true;

    // Function to fetch and display search results
    async function fetchSearchResults(query) {
        console.log("Searching for:", query);

        if (!query || query.length < 2) {
            searchDropdown.style.display = "none";
            return;
        }

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/search-proxy",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    body: JSON.stringify({
                        search_text: query,
                    }),
                }
            );

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }

            const results = await response.json();
            console.log("Search results:", results);

            displaySearchResults(results);
        } catch (error) {
            console.error("Full error details:", error);
            displaySearchResults([]);
        }
    }

    // Fallback: Client-side search when API isn't available
    function performClientSideSearch(query) {
        // This function searches through the visible events on the page
        query = query.toLowerCase().trim();
        const eventCards = document.querySelectorAll(".event-card");
        const results = [];

        eventCards.forEach((card) => {
            const title = card.querySelector("h3")?.textContent || "";
            const description = card.querySelector("p")?.textContent || "";
            let eventId = null;

            try {
                if (card.onclick) {
                    const onclickStr = card.onclick.toString();
                    const idMatch = onclickStr.match(/id=([^&]+)/);
                    if (idMatch && idMatch[1]) {
                        eventId = idMatch[1];
                    }
                }
            } catch (e) {
                console.error("Error extracting event ID:", e);
            }

            if (
                (title.toLowerCase().includes(query) ||
                    description.toLowerCase().includes(query)) &&
                eventId
            ) {
                const locationSection = card.closest(".location-section");
                const locationHeader =
                    locationSection?.querySelector(".location-header");

                results.push({
                    id: eventId,
                    title: title,
                    description: description.substring(0, 60) + "...",
                    location: locationHeader
                        ? locationHeader.textContent
                        : "Unknown location",
                });
            }
        });

        displaySearchResults(results);
    }

    // Function to display search results in the dropdown
    function displaySearchResults(results) {
        searchDropdown.innerHTML = "";

        if (!results || results.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "no-results";
            noResults.textContent = "No events found";
            searchDropdown.appendChild(noResults);
            searchDropdown.style.display = "block";
            return;
        }

        results.forEach((result) => {
            const resultItem = document.createElement("div");
            resultItem.className = "result-item";
            resultItem.innerHTML = `
                <div class="result-title">${
                    result.title || "Untitled Event"
                }</div>
                <div class="result-details">
                    ${
                        result.location
                            ? `<span class="result-location">${result.location}</span>`
                            : ""
                    }
                    <p class="result-description">${(
                        result.description || "No description"
                    ).substring(0, 100)}...</p>
                </div>
            `;

            resultItem.addEventListener("click", () => {
                window.location.href = `event.html?id=${result.id}`;
            });

            searchDropdown.appendChild(resultItem);
        });

        searchDropdown.style.display = "block";
    }

    // Event listener for search input with debounce
    let debounceTimer;
    searchBar.addEventListener("input", function () {
        const query = this.value.trim();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchSearchResults(query);
        }, 300); // Debounce for 300ms to avoid excessive API calls
    });

    searchButton.addEventListener("click", function () {
        const searchTerm = searchBar.value.toLowerCase().trim();
        if (searchTerm.length >= 2) {
            fetchSearchResults(searchTerm);
        } else {
            performSearch();
        }
    });

    searchBar.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            const searchTerm = this.value.trim();
            if (searchTerm.length >= 2) {
                fetchSearchResults(searchTerm);
            } else {
                performSearch();
            }
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (
            allowDropdownClose &&
            !searchDropdown.contains(e.target) &&
            e.target !== searchBar &&
            e.target !== searchButton
        ) {
            searchDropdown.style.display = "none";
        }
    });

    // Prevent dropdown from closing when clicking inside it
    searchDropdown.addEventListener("click", function (e) {
        allowDropdownClose = false;
        setTimeout(() => {
            allowDropdownClose = true;
        }, 100);
    });

    // Close dropdown when pressing Escape
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            searchDropdown.style.display = "none";
        }
    });

    eventRows.forEach((row) => {
        row.addEventListener("scroll", function () {
            updateArrowVisibility();
        });
    });

    window.addEventListener("resize", updateArrowVisibility);

    function updateArrowVisibility() {
        eventRows.forEach((row) => {
            const leftArrow = row.previousElementSibling;
            const rightArrow = row.nextElementSibling;

            if (!leftArrow || !rightArrow) return;

            leftArrow.style.opacity = row.scrollLeft > 20 ? "1" : "0.3";

            const isAtEnd =
                row.scrollLeft + row.clientWidth >= row.scrollWidth - 20;
            rightArrow.style.opacity = isAtEnd ? "0.3" : "1";
        });
    }

    // Original search functionality for highlighting events on the page
    async function performSearch(query) {
        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/search-proxy",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        search_text: query,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const results = await response.json();
            storeSearchResults(query, results);
            createSearchResultsSection(query, results);
        } catch (error) {
            console.error("Search error:", error);
            createSearchResultsSection(query, []);
        }
    }

    function showAllEvents() {
        const eventCards = document.querySelectorAll(".event-card");
        eventCards.forEach((card) => {
            card.style.border = "none";
            card.style.opacity = "1";
            card.style.transform = "scale(1)";
        });
    }

    // Fetch the top 10 events for each category to show on the page
    async function fetchEvents(city, containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(
                    `Container element with ID "${containerId}" not found`
                );
                return;
            }

            const response = await fetch(
                `http://localhost:5000/api/events-by-city?city=${encodeURIComponent(
                    city
                )}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const events = await response.json();
            container.innerHTML = "";

            if (!events || events.length === 0) {
                const noEvents = document.createElement("div");
                noEvents.className = "no-events-message";
                noEvents.textContent = `No events found for ${
                    city || "this location"
                }`;
                noEvents.style.padding = "20px";
                noEvents.style.textAlign = "center";
                container.appendChild(noEvents);
                return;
            }

            events.forEach((event) => {
                const card = document.createElement("div");
                card.className = "event-card";

                // Ensure we have a valid event ID
                const eventId = event.id || "";

                card.onclick = () => {
                    window.location.href = `event.html?id=${eventId}`;
                };

                card.innerHTML = `
                    <div class="event-icon" style="background-image: url('${
                        event.image || ""
                    }')"></div>
                    <h3>${event.title || "Untitled Event"}</h3>
                    <p>${(
                        event.description || "No description available"
                    ).substring(0, 100)}...</p>
                `;

                container.appendChild(card);
            });
        } catch (err) {
            console.error(`Failed to load events for ${city}:`, err);

            // Show error message in the container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border-radius: 8px;">
                        <p>Sorry, we couldn't load events for ${
                            city || "this location"
                        }.</p>
                        <p>Please try again later.</p>
                    </div>
                `;
            }
        }
    }

    // Fetch recommended events for the current user
    async function fetchRecommendedEvents(forceRefresh = false) {
        const userSession = JSON.parse(localStorage.getItem("userSession"));
        if (!userSession || !userSession.email) return;

        // Skip cache if forceRefresh is true
        if (!forceRefresh) {
            // Check if we have recent recommended events in localStorage
            const cachedEvents = loadRecommendedEvents();
            if (cachedEvents && cachedEvents.length >= 4) {
                console.log(
                    "Loading recommended events from cache:",
                    cachedEvents.length
                );
                displayRecommendedEvents(cachedEvents);

                // After displaying cached events, fetch fresh data in the background
                setTimeout(() => fetchRecommendedEvents(true), 1000);
                return cachedEvents;
            }
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/filtered-events?user_id=${encodeURIComponent(
                    userSession.email
                )}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const events = await response.json();
            console.log("Fresh recommended events:", events);

            // Sort by score (highest first)
            const sortedEvents = events.sort((a, b) => b.score - a.score);

            // Store events in localStorage for future visits
            storeRecommendedEvents(sortedEvents);

            // If we have at least 4 events, show them
            if (sortedEvents.length >= 4) {
                displayRecommendedEvents(sortedEvents);
            }

            // If we have 10 or more events, stop polling
            if (sortedEvents.length >= 10) {
                console.log("Received 10+ recommended events, stopping poller");
                clearInterval(recommendedEventsInterval);
                recommendedEventsInterval = null;
            }

            return sortedEvents;
        } catch (error) {
            console.error("Error fetching recommended events:", error);

            // Display error message if this is the initial load
            if (forceRefresh === false) {
                const loadingElement = document.getElementById(
                    "recommended-loading"
                );
                if (loadingElement) {
                    loadingElement.innerHTML = `
                        <div class="loading-message">
                            <p>Error loading recommendations.</p>
                            <p>Please try again later.</p>
                        </div>
                    `;
                }
            }

            return [];
        }
    }

    // Function to display recommended events
    function displayRecommendedEvents(events) {
        const container = document.getElementById("recommended-container");
        const loadingElement = document.getElementById("recommended-loading");
        const eventRow = document.getElementById("recommended-row");

        if (!container || !loadingElement || !eventRow) {
            console.error("Recommended events elements not found");
            return;
        }

        // Hide loading, show container
        loadingElement.style.display = "none";
        container.style.display = "block";

        // Clear existing events
        eventRow.innerHTML = "";

        // Limit to max 10 events
        const eventsToShow = events.slice(0, 10);

        // Add events to the row
        eventsToShow.forEach((event) => {
            const card = document.createElement("div");
            card.className = "event-card";

            // Extract the actual event ID from composite IDs like "email_eventId"
            let eventId = event.id ? event.id.toString() : null;

            // Check if it's a composite ID and extract just the event part
            if (eventId && eventId.includes("_")) {
                eventId = eventId.split("_")[1]; // Get the second part after the underscore
            }

            if (eventId) {
                card.onclick = () =>
                    (window.location.href = `event.html?id=${eventId}`);
            }

            // Create card content
            card.innerHTML = `
                <div class="event-icon" style="background-image: url('${
                    event.image || ""
                }')"></div>
                <h3>${event.title || "Untitled Event"}</h3>
                <p>${(
                    event.description || "No description available"
                ).substring(0, 100)}...</p>
                <div class="match-score">
                    <div class="score-badge">${Math.round(
                        event.score
                    )}% Match</div>
                </div>
            `;

            eventRow.appendChild(card);
        });

        // Update arrow visibility
        updateArrowVisibility();
    }

    // Initialize recommended events
    function initRecommendedEvents() {
        // First try to load from cache
        const cachedEvents = loadRecommendedEvents();
        if (cachedEvents && cachedEvents.length >= 4) {
            console.log("Displaying cached recommended events");
            displayRecommendedEvents(cachedEvents);

            // Fetch fresh data in the background after a short delay
            setTimeout(() => fetchRecommendedEvents(true), 1000);
        } else {
            // No cache, proceed with normal loading
            fetchRecommendedEvents().then((events) => {
                if (!events || events.length < 4) {
                    // Start polling for events, but limit how long we poll
                    recommendedEventsInterval = setInterval(
                        () => fetchRecommendedEvents(true),
                        5000
                    );

                    // After 2 minutes, stop polling and show a message
                    setTimeout(() => {
                        if (recommendedEventsInterval) {
                            clearInterval(recommendedEventsInterval);
                            recommendedEventsInterval = null;

                            const loadingElement = document.getElementById(
                                "recommended-loading"
                            );
                            if (loadingElement) {
                                loadingElement.innerHTML = `
                                    <div class="loading-message">
                                        <p>We're still personalizing your recommendations.</p>
                                        <p>Please check back soon!</p>
                                    </div>
                                `;
                            }
                        }
                    }, 120000);
                }
            });
        }

        // Set up a periodic refresh to check for new recommendations every 2 minutes
        setInterval(() => fetchRecommendedEvents(true), 120000);
    }

    // In your createSearchResultsSection function in main-script.js
    function createSearchResultsSection(query, results) {
        // Check if the section already exists and remove it
        const existingSection = document.querySelector(
            ".search-results-section"
        );
        if (existingSection) {
            existingSection.remove();
        }

        // Create new section for search results
        const resultsSection = document.createElement("div");
        resultsSection.className = "location-section search-results-section";

        // Create header with query
        const header = document.createElement("h2");
        header.className = "location-header";
        header.textContent = `Results for "${query}"`;
        resultsSection.appendChild(header);

        // Create row container and event row
        const rowContainer = document.createElement("div");
        rowContainer.className = "row-container";

        const leftArrow = document.createElement("div");
        leftArrow.className = "slider-arrow left";
        leftArrow.textContent = "←";

        const eventRow = document.createElement("div");
        eventRow.className = "event-row";
        eventRow.id = "search-results-row";

        const rightArrow = document.createElement("div");
        rightArrow.className = "slider-arrow right";
        rightArrow.textContent = "→";

        rowContainer.appendChild(leftArrow);
        rowContainer.appendChild(eventRow);
        rowContainer.appendChild(rightArrow);
        resultsSection.appendChild(rowContainer);

        // Insert the section at the top of the events container
        const eventsContainer = document.querySelector(".events-container");
        const firstSection = eventsContainer.querySelector(".location-section");
        if (firstSection) {
            eventsContainer.insertBefore(resultsSection, firstSection);
        } else {
            eventsContainer.appendChild(resultsSection);
        }

        // Add the events to the row
        if (results && results.length > 0) {
            populateSearchResults(results, eventRow);
        } else {
            // Add a "no results" message with suggestions
            const noResults = document.createElement("div");
            noResults.className = "no-results-message";
            noResults.textContent =
                "No events found matching your search criteria.";
            noResults.style.padding = "30px 20px";
            noResults.style.textAlign = "center";
            noResults.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
            noResults.style.borderRadius = "8px";
            eventRow.appendChild(noResults);
        }

        // Add event listeners for arrows - this is the key fix
        leftArrow.addEventListener("click", function () {
            const cardWidth =
                eventRow.querySelector(".event-card")?.offsetWidth || 300;
            eventRow.scrollBy({
                left: -cardWidth - 20, // Account for gap
                behavior: "smooth",
            });
        });

        rightArrow.addEventListener("click", function () {
            const cardWidth =
                eventRow.querySelector(".event-card")?.offsetWidth || 300;
            eventRow.scrollBy({
                left: cardWidth + 20, // Account for gap
                behavior: "smooth",
            });
        });

        // Run this after a slight delay to ensure DOM is ready
        setTimeout(() => {
            updateArrowVisibility();
        }, 100);
    }

    function populateSearchResults(results, container) {
        console.log("Populating results:", results);

        if (!results || results.length === 0) {
            console.log("No results to populate");
            return;
        }

        results.forEach((event, index) => {
            console.log(`Processing event ${index}:`, event);

            if (!event || !event.title) {
                console.log(`Event ${index} is invalid:`, event);
                return;
            }

            const card = document.createElement("div");
            card.className = "event-card";

            // Make sure we have a valid ID for the event
            const eventId = event.id || `search-result-${index}`;

            card.onclick = () =>
                (window.location.href = `event.html?id=${eventId}`);

            // Create card with fallback for missing properties
            card.innerHTML = `
                <div class="event-icon" style="background-image: url('${
                    event.image || ""
                }')"></div>
                <h3>${event.title || "Untitled Event"}</h3>
                <p>${(
                    event.description || "No description available"
                ).substring(0, 100)}...</p>
            `;

            container.appendChild(card);
        });
    }

    // Add event listener for the main search bar
    mainSearchBar.addEventListener("keypress", async function (e) {
        if (e.key === "Enter") {
            const query = this.value.trim();
            if (query.length < 2) return;

            try {
                mainSearchBar.disabled = true;
                mainSearchBar.placeholder = "Searching...";

                const response = await fetch(
                    "http://127.0.0.1:5000/api/search-proxy",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            search_text: query,
                        }),
                    }
                );

                const results = await response.json();

                // Store search results for back navigation
                storeSearchResults(query, results);

                createSearchResultsSection(query, results);

                mainSearchBar.disabled = false;
                mainSearchBar.placeholder = "AI Powered Search 🤖";
            } catch (error) {
                console.error("Search error:", error);
                mainSearchBar.disabled = false;
                mainSearchBar.placeholder = "AI Powered Search 🤖";
                createSearchResultsSection(query, []);
            }
        }
    });

    // Check for stored search results
    const hasStoredSearchResults = checkForStoredSearchResults();

    // Load initial data - Fixed to remove non-existent "popularity-row"
    await fetchEvents("Hoboken", "hoboken-row");
    await fetchEvents("New York City", "nyc-row");
    await fetchEvents("Other", "other-row");

    // Initialize recommended events
    initRecommendedEvents();

    // Ensure the arrows are properly updated a small moment after the events are loaded
    setTimeout(() => {
        updateArrowVisibility();
    }, 100);

    // Add this function to clear recommendation cache
    function clearRecommendationCache() {
        const userSession = JSON.parse(localStorage.getItem("userSession"));
        if (userSession && userSession.email) {
            localStorage.removeItem(`recommendedEvents_${userSession.email}`);
            localStorage.removeItem(
                `recommendedEventsTime_${userSession.email}`
            );
        }
    }
});
