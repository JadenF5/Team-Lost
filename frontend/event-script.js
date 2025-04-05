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
    const iframe = document.querySelector(".map iframe");
    const extraContent = document.querySelector(".extra-content");

    if (eventId) {
        try {
            // Fetch event data from Flask API
            const response = await fetch(`http://localhost:5000/api/event?id=${eventId}`);
            const event = await response.json();

            // Dynamically update content
            document.title = event.title || "Event Title"
            eventTitle.textContent = event.title || `Event ${eventId}`;
            description.textContent = event.description || "No description available.";
            price.textContent = event.date || ""; // Temporaily date, will change this when we can estimate a price

            // Display an image of the event if there is one
            if(event.image) {
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
});
