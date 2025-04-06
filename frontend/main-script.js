document.addEventListener("DOMContentLoaded", async function () {
    const searchBar = document.getElementById("search-bar");
    const searchButton = document.getElementById("search-button");

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
            const response = await fetch(`http://localhost:5000/api/events-by-city?city=${encodeURIComponent(city)}`);
            const events = await response.json();

            const container = document.getElementById(containerId);
            container.innerHTML = "";

            events.forEach(event => {
                const card = document.createElement("div");
                card.className = "event-card";
                card.onclick = () => window.location.href = `event.html?id=${event.id}`;

                card.innerHTML = `
                    <div class="event-icon" style="background-image: url('${event.image || ''}')"></div>
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
});


