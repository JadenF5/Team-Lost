document.addEventListener("DOMContentLoaded", async function () {
    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (!userSession) {
        window.location.href = "index.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("id");

    const eventTitle = document.querySelector("h1");
    const description = document.querySelector(".desc p");
    const price = document.querySelector(".price-box");
    const mapContainer = document.querySelector(".map");
    const iframe = document.querySelector(".map iframe");
    const extraContent = document.querySelector(".extra-content");

    if (eventId) {
        try {
            // Fetch event data from Flask API
            const response = await fetch(
                `http://localhost:5000/api/event?id=${eventId}`
            );
            const event = await response.json();

            // Dynamically update content
            document.title = event.title || "Event Title";
            eventTitle.textContent = event.title || `Event ${eventId}`;
            description.textContent =
                event.description || "No description available.";
            price.textContent = event.date || ""; // Temporaily date, will change this when we can estimate a price

            if (event.location) {
                updateMap(event.location);
                addLocationInfo(event.location);
            }

            // Display an image of the event if there is one
            if (event.image) {
                const img = document.createElement("img");
                img.src = event.image;
                img.alt = event.title || "Event Image";
                img.style.width = "100%";
                img.style.marginTop = "20px";
                extraContent.appendChild(img);
            }

            // If possible, link back to the original event site for more information
            if (event.url) {
                const link = document.createElement("a");
                link.href = event.url;
                link.textContent = "More Info";
                link.target = "_blank";
                link.style.display = "block";
                link.style.marginTop = "10px";
                extraContent.appendChild(link);
            }
        } catch (err) {
            console.error("Error fetching event data:", err);
        }
    }

    const backLink = document.querySelector(".back-link");
    if (backLink) {
        backLink.href = "main.html";
    }

    function updateMap(location) {
        if (!location) return;

        try {
            // Format the location for the URL
            const encodedLocation = encodeURIComponent(location);

            // Handle different location formats
            let mapLocation = encodedLocation;
            let searchLocation = location;

            // Check if the location already has address components
            if (!location.includes(",")) {
                // Append city names to make the map more accurate for common event locations
                if (location.toLowerCase().includes("hoboken")) {
                    mapLocation = `${encodedLocation},+Hoboken,+NJ`;
                    searchLocation = `${location}, Hoboken, NJ`;
                } else if (location.toLowerCase().includes("jersey city")) {
                    mapLocation = `${encodedLocation},+Jersey+City,+NJ`;
                    searchLocation = `${location}, Jersey City, NJ`;
                } else if (location.toLowerCase().includes("new york")) {
                    mapLocation = `${encodedLocation},+New+York,+NY`;
                    searchLocation = `${location}, New York, NY`;
                } else {
                    // Default append NJ since most events are in New Jersey
                    mapLocation = `${encodedLocation},+NJ`;
                    searchLocation = `${location}, NJ`;
                }
            }

            // Try to use Google Maps embed first
            const googleMapSrc = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapLocation}&zoom=15`;

            // Update the iframe or create a new one
            if (iframe) {
                iframe.src = googleMapSrc;

                // Set up error handler in case Google Maps API fails
                iframe.onerror = function () {
                    fallbackToStaticMap(searchLocation);
                };

                // Also set a timeout in case the iframe loads but shows an error page
                setTimeout(() => {
                    try {
                        // If we can access the iframe and it has an error, use fallback
                        if (
                            iframe.contentDocument &&
                            iframe.contentDocument.body &&
                            iframe.contentDocument.body.innerHTML.includes(
                                "error"
                            )
                        ) {
                            fallbackToStaticMap(searchLocation);
                        }
                    } catch (e) {
                        // Security exceptions are expected when trying to access iframe content
                        // This is normal and we can ignore it
                    }
                }, 2000);
            } else {
                // If iframe is not found, create a new one
                const newIframe = document.createElement("iframe");
                newIframe.src = googleMapSrc;
                newIframe.width = "100%";
                newIframe.height = "300";
                newIframe.style.border = "0";
                newIframe.allowFullscreen = true;
                newIframe.loading = "lazy";
                newIframe.referrerPolicy = "no-referrer-when-downgrade";
                newIframe.onerror = function () {
                    fallbackToStaticMap(searchLocation);
                };

                // Clear the map container and append the new iframe
                mapContainer.innerHTML = "";
                mapContainer.appendChild(newIframe);
            }
        } catch (error) {
            console.error("Error updating map:", error);
            fallbackToStaticMap(location);
        }
    }

    function fallbackToStaticMap(location) {
        // Create alternative map using OpenStreetMap
        const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-74.1%2C40.7%2C-73.9%2C40.9&amp;layer=mapnik&amp;marker=40.8%2C-74.0`;

        // Replace the iframe with OpenStreetMap
        if (iframe) {
            iframe.src = osmUrl;
        } else {
            // Create a new iframe if needed
            const newIframe = document.createElement("iframe");
            newIframe.src = osmUrl;
            newIframe.width = "100%";
            newIframe.height = "300";
            newIframe.style.border = "0";
            newIframe.loading = "lazy";

            // Clear the map container and append the new iframe
            if (mapContainer.querySelector("iframe")) {
                mapContainer.querySelector("iframe").replaceWith(newIframe);
            } else {
                mapContainer.innerHTML = "";
                mapContainer.appendChild(newIframe);
            }
        }

        // Make sure the location info is shown
        addLocationInfo(location);
    }

    function addLocationInfo(location) {
        // Check if location info box already exists
        let locationInfo = mapContainer.querySelector(".location-info");
        if (!locationInfo) {
            // Create the location info box
            locationInfo = document.createElement("div");
            locationInfo.className = "location-info";
            mapContainer.appendChild(locationInfo);
        }

        // Format the address for better display
        let formattedLocation = location;
        if (location.includes(",")) {
            // Try to split the address into parts for better formatting
            const parts = location.split(",").map((part) => part.trim());

            if (parts.length >= 3) {
                // Format as "Place Name, Street Address, City, State"
                formattedLocation = parts.join(",<br>");
            }
        }

        // Update the content
        locationInfo.innerHTML = `
            <div class="location-title">Event Location</div>
            <div class="location-address">${formattedLocation}</div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(
                location
            )}" target="_blank" class="directions-link">
                Get Directions
            </a>
        `;
    }
});
