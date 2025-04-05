document.addEventListener("DOMContentLoaded", function () {
    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (!userSession) {
        window.location.href = "index.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("id");

    if (eventId) {
        const eventTitle = document.querySelector("h1");
        eventTitle.textContent = `Event ${eventId}`;
    }
    const backLink = document.querySelector(".back-link");
    if (backLink) {
        backLink.href = "main.html";
    }
});
