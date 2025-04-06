document.addEventListener("DOMContentLoaded", async function () {
    const searchBar = document.getElementById("search-bar");
    const searchButton = document.getElementById("search-button");
    const mainSearchBar = document.getElementById("main-search-bar");
    let aiSearchResults = null;

    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (!userSession) {
        window.location.href = "index.html";
        return;
    }

    const userNameElement = document.getElementById("user-name");
    if (userNameElement && userSession.name) {
        userNameElement.textContent = `Welcome, ${userSession.name}`;
    }

    // Handle logout
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
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
        if (!query || query.length < 2) {
            searchDropdown.style.display = "none";
            return;
        }

        try {
            // Fetch events from the API
            const response = await fetch(
                `http://localhost:5000/api/search?q=${encodeURIComponent(
                    query
                )}`
            );

            // If the backend search API isn't implemented yet, we'll use a fallback client-side search
            if (!response.ok) {
                performClientSideSearch(query);
                return;
            }

            const results = await response.json();
            displaySearchResults(results);
        } catch (error) {
            console.error("Error fetching search results:", error);
            // Fallback to client-side filtering
            performClientSideSearch(query);
        }
    }

    // Fallback: Client-side search when API isn't available
    function performClientSideSearch(query) {
        // This function searches through the visible events on the page
        query = query.toLowerCase().trim();
        const eventCards = document.querySelectorAll(".event-card");
        const results = [];

        eventCards.forEach((card) => {
            const title = card.querySelector("h3").textContent;
            const description = card.querySelector("p").textContent;
            const eventId = card.onclick
                ? card.onclick.toString().match(/id=(\d+)/)[1]
                : null;

            if (
                (title.toLowerCase().includes(query) ||
                    description.toLowerCase().includes(query)) &&
                eventId
            ) {
                results.push({
                    id: eventId,
                    title: title,
                    description: description.substring(0, 60) + "...",
                    location: card
                        .closest(".location-section")
                        .querySelector(".location-header").textContent,
                });
            }
        });

        displaySearchResults(results);
    }

    // Function to display search results in the dropdown
    function displaySearchResults(results) {
        searchDropdown.innerHTML = "";

        if (results.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "no-results";
            noResults.textContent = "No events found";
            searchDropdown.appendChild(noResults);
            searchDropdown.style.display = "block";
            return;
        }

        results.forEach((result) => {
            // Format location if available
            let locationText = "";
            if (result.location) {
                // Clean up location text
                locationText = result.location.trim();

                // If there's an address in the location (often has numbers), keep it as is
                if (!locationText.match(/\d+/)) {
                    locationText = `${locationText}`;
                }
            }

            // Prepare description - make it a bit cleaner
            const description = result.description || "";
            let formattedDescription = description;

            // If description contains the title, don't repeat it
            if (description.includes(result.title)) {
                formattedDescription = description;
            }

            const resultItem = document.createElement("div");
            resultItem.className = "result-item";
            resultItem.innerHTML = `
                <div class="result-title">${result.title}</div>
                <div class="result-details">
                    ${
                        locationText
                            ? `<span class="result-location">${locationText}</span>`
                            : ""
                    }
                    <p class="result-description">${formattedDescription}</p>
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

            leftArrow.style.opacity = row.scrollLeft > 20 ? "1" : "0.3";

            const isAtEnd =
                row.scrollLeft + row.clientWidth >= row.scrollWidth - 20;
            rightArrow.style.opacity = isAtEnd ? "0.3" : "1";
        });
    }

    // Original search functionality for highlighting events on the page
    function performSearch() {
        const searchTerm = searchBar.value.toLowerCase().trim();

        if (searchTerm === "") {
            showAllEvents();
            return;
        }

        const eventCards = document.querySelectorAll(".event-card");
        let hasMatches = false;

        eventCards.forEach((card) => {
            const title = card.querySelector("h3").textContent.toLowerCase();
            const description = card
                .querySelector("p")
                .textContent.toLowerCase();

            if (
                title.includes(searchTerm) ||
                description.includes(searchTerm)
            ) {
                card.style.border = "2px solid #4285f4";
                card.style.transform = "scale(1.03)";
                hasMatches = true;
            } else {
                card.style.border = "none";
                card.style.opacity = "0.6";
                card.style.transform = "scale(1)";
            }
        });

        if (!hasMatches) {
            alert("No events found matching your search");
            showAllEvents();
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

    // Fetch the top 10 events for each catagory to show on the page
    async function fetchEvents(city, containerId) {
        try {
            const response = await fetch(
                `http://localhost:5000/api/events-by-city?city=${encodeURIComponent(
                    city
                )}`
            );
            const events = await response.json();

            const container = document.getElementById(containerId);
            container.innerHTML = "";

            events.forEach((event) => {
                const card = document.createElement("div");
                card.className = "event-card";
                card.onclick = () =>
                    (window.location.href = `event.html?id=${event.id}`);

                card.innerHTML = `
                    <div class="event-icon" style="background-image: url('${
                        event.image || ""
                    }')"></div>
                    <h3>${event.title}</h3>
                    <p>${event.description?.substring(0, 100)}...</p>
                    `;

                container.appendChild(card);
            });
        } catch (err) {
            console.error(`Failed to load events for ${city}:`, err);
        }
    }

    await fetchEvents("", "popularity-row");
    await fetchEvents("Hoboken", "hoboken-row");
    await fetchEvents("New York City", "nyc-row");
    await fetchEvents("Other", "other-row");

    // Ensure the arrows are properly updated a small moment after the events are loaded
    setTimeout(() => {
        updateArrowVisibility();
    }, 100);

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

        // Insert the section at the top of the events container, before the Popularity section
        const eventsContainer = document.querySelector(".events-container");
        const popularitySection = document.querySelector(".location-section");
        eventsContainer.insertBefore(resultsSection, popularitySection);

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
                // Show loading state
                mainSearchBar.disabled = true;
                mainSearchBar.placeholder = "Searching...";

                // Call the AI search endpoint
                console.log("Searching for:", query);
                const response = await fetch(
                    `http://localhost:5000/api/query?usertext=${encodeURIComponent(
                        query
                    )}`
                );

                // For debugging
                const responseText = await response.text();
                console.log("Raw API Response:", responseText);

                // Convert back to JSON
                const results = JSON.parse(responseText);
                console.log("Parsed results:", results);

                aiSearchResults = Array.isArray(results) ? results : [results]; // Ensure we have an array
                console.log("Final results array:", aiSearchResults);

                // Create search results section
                createSearchResultsSection(query, aiSearchResults);

                // Reset search bar
                mainSearchBar.disabled = false;
                mainSearchBar.placeholder = "Search for events";
            } catch (error) {
                console.error("AI search error:", error);
                mainSearchBar.disabled = false;
                mainSearchBar.placeholder = "Search for events";

                // Create empty search results section even on error
                createSearchResultsSection(query, []);

                alert(
                    "Sorry, there was an error with your search. Please try again."
                );
            }
        }
    });
});
