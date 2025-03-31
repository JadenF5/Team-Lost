document.addEventListener("DOMContentLoaded", function () {
    const searchBar = document.getElementById("search-bar");
    const searchButton = document.getElementById("search-button");

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
});
