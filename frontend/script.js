function storeUserSession(userData) {
    localStorage.setItem("userSession", JSON.stringify(userData));
}

function checkUserSession() {
    return JSON.parse(localStorage.getItem("userSession"));
}

function handleCredentialResponse(response) {
    const token = response.credential;

    fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: token }),
    })
        .then((response) => {
            console.log("Response status:", response.status);
            return response.json();
        })
        .then((data) => {
            console.log("Received data:", data);
            if (data.success) {
                storeUserSession({
                    name: data.name || data.username,
                    email: data.email,
                    isLoggedIn: true,
                });

                window.location.href = "main.html";
            } else {
                console.error("Login failed:", data.error);
                alert(data.error || "Login failed");
            }
        })
        .catch((error) => {
            console.error("Full error details:", error);
            alert("Login failed. Please try again later.");
        });
}

// New Google Sign-Up handler
function handleGoogleSignUp(response) {
    const token = response.credential;

    fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: token }),
    })
        .then((response) => {
            console.log("Signup response status:", response.status);
            return response.json();
        })
        .then((data) => {
            console.log("Received signup data:", data);
            if (data.success) {
                storeUserSession({
                    name: data.name || data.username,
                    email: data.email,
                    isLoggedIn: true,
                });

                window.location.href = "main.html";
            } else {
                console.error("Signup failed:", data.error);
                alert(data.error || "Sign up failed");
            }
        })
        .catch((error) => {
            console.error("Full signup error details:", error);
            alert("Sign up failed. Please try again later.");
        });
}

document.addEventListener("DOMContentLoaded", function () {
    const userSession = checkUserSession();
    if (userSession && userSession.isLoggedIn) {
        window.location.href = "main.html";
    }

    // Modal functionality
    const signinBtn = document.getElementById("signin-btn");
    const signupBtn = document.getElementById("signup-btn");
    const signinModal = document.getElementById("signin-modal");
    const signupModal = document.getElementById("signup-modal");
    const closeButtons = document.querySelectorAll(".close");

    signinBtn.addEventListener("click", function () {
        signinModal.style.display = "block";
    });

    signupBtn.addEventListener("click", function () {
        signupModal.style.display = "block";
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", function () {
            signinModal.style.display = "none";
            signupModal.style.display = "none";
        });
    });

    window.addEventListener("click", function (event) {
        if (event.target === signinModal) {
            signinModal.style.display = "none";
        }
        if (event.target === signupModal) {
            signupModal.style.display = "none";
        }
    });

    const signinForm = document.getElementById("signin-form");
    signinForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const username = document.getElementById("signin-username").value;
        const password = document.getElementById("signin-password").value;

        fetch("http://127.0.0.1:5000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        })
            .then((response) => {
                console.log("Login response status:", response.status);
                return response.json();
            })
            .then((data) => {
                console.log("Received login data:", data);
                if (data.success) {
                    storeUserSession({
                        name: username,
                        isLoggedIn: true,
                    });
                    window.location.href = "main.html";
                } else {
                    console.error("Login failed:", data.error);
                    alert(data.error || "Login failed");
                }
            })
            .catch((error) => {
                console.error("Full login error details:", error);
                alert("Login failed. Please try again later.");
            });
    });

    const signupForm = document.getElementById("signup-form");
    signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const username = document.getElementById("signup-username").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById(
            "signup-confirm-password"
        ).value;

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        fetch("http://127.0.0.1:5000/signup", {
            // IMPORTANT: Changed from /login to /signup
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
            }),
        })
            .then((response) => {
                console.log("Signup response status:", response.status);
                return response.json();
            })
            .then((data) => {
                console.log("Received signup data:", data);
                if (data.success) {
                    storeUserSession({
                        name: username,
                        email: email,
                        isLoggedIn: true,
                    });
                    window.location.href = "main.html";
                } else {
                    console.error("Signup failed:", data.error);
                    alert(data.error || "Sign up failed");
                }
            })
            .catch((error) => {
                console.error("Full signup error details:", error);
                alert("Sign up failed. Please try again later.");
            });
    });
});
