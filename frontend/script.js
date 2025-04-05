function storeUserSession(userData) {
    localStorage.setItem("userSession", JSON.stringify(userData));
  }
  
  function checkUserSession() {
    return JSON.parse(localStorage.getItem("userSession"));
  }
  
  // Google Login Callback
  function handleCredentialResponse(response) {
    const token = response.credential;
  
    fetch("http://127.0.0.1:5000/login/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          storeUserSession({
            name: data.user?.username || data.user?.name,
            email: data.user?.email,
            isLoggedIn: true,
          });
          window.location.href = "main.html";
        } else {
          alert(data.error || "Google login failed");
        }
      })
      .catch(err => {
        console.error("Google Login Error:", err);
        alert("Google login failed.");
      });
  }
  
  // Google Signup Callback
  function handleGoogleSignUp(response) {
    const token = response.credential;
  
    fetch("http://127.0.0.1:5000/signup/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          storeUserSession({
            name: data.username || data.name,
            email: data.email,
            isLoggedIn: true,
          });
          window.location.href = "main.html";
        } else {
          alert(data.error || "Google signup failed");
        }
      })
      .catch(err => {
        console.error("Google Signup Error:", err);
        alert("Google signup failed.");
      });
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const userSession = checkUserSession();
    if (userSession?.isLoggedIn) {
      window.location.href = "main.html";
    }
  
    const signinBtn = document.getElementById("signin-btn");
    const signupBtn = document.getElementById("signup-btn");
    const signinModal = document.getElementById("signin-modal");
    const signupModal = document.getElementById("signup-modal");
    const closeButtons = document.querySelectorAll(".close");
  
    signinBtn.addEventListener("click", () => signinModal.style.display = "block");
    signupBtn.addEventListener("click", () => signupModal.style.display = "block");
  
    closeButtons.forEach(button => {
      button.addEventListener("click", () => {
        signinModal.style.display = "none";
        signupModal.style.display = "none";
      });
    });
  
    window.addEventListener("click", (event) => {
      if (event.target === signinModal) signinModal.style.display = "none";
      if (event.target === signupModal) signupModal.style.display = "none";
    });
  
    // Regular login
    document.getElementById("signin-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email_or_username = document.getElementById("signin-username").value;
      const password = document.getElementById("signin-password").value;
  
      fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_or_username, password }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            storeUserSession({ name: data.user.username, email: data.user.email, isLoggedIn: true });
            window.location.href = "main.html";
          } else {
            alert(data.error || "Login failed");
          }
        })
        .catch(err => {
          console.error("Login error:", err);
          alert("Login failed.");
        });
    });
  
    // Regular signup
    document.getElementById("signup-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("signup-username").value;
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;
      const confirm_password = document.getElementById("signup-confirm-password").value;
  
      if (password !== confirm_password) {
        alert("Passwords do not match");
        return;
      }
  
      fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirm_password }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            storeUserSession({ name: username, email, isLoggedIn: true });
            window.location.href = "main.html";
          } else {
            alert(data.error || "Signup failed");
          }
        })
        .catch(err => {
          console.error("Signup error:", err);
          alert("Signup failed.");
        });
    });
  
    // Google flow selection
    document.getElementById("google-login-btn").addEventListener("click", () => {
      window.googleFlowType = "login";
      google.accounts.id.prompt();
    });
  
    document.getElementById("google-signup-btn").addEventListener("click", () => {
      window.googleFlowType = "signup";
      google.accounts.id.prompt();
    });
  });
  
  // Init Google Identity
  window.onload = () => {
    google.accounts.id.initialize({
      client_id: "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com",
      callback: (response) => {
        if (window.googleFlowType === "signup") {
          handleGoogleSignUp(response);
        } else {
          handleCredentialResponse(response);
        }
      }
    });
  };
  