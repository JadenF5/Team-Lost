document.addEventListener("DOMContentLoaded", function () {
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

    searchButton.addEventListener("click", function () {
        performSearch();
    });

    searchBar.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            performSearch();
        }
    });

    updateArrowVisibility();

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
});
