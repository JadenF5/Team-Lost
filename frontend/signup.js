google.accounts.id.initialize({
    client_id: "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com",
    callback: handleGoogleSignup
  });
  
  google.accounts.id.renderButton(
    document.getElementById("google-signup-btn"),
    {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signup_with",
      shape: "rectangular"
    }
  );
  
  function handleGoogleSignup(response) {
    const token = response.credential;
  
    fetch("http://127.0.0.1:5000/signup/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem("userSession", JSON.stringify({
            name: data.username || data.name,
            email: data.email,
            isLoggedIn: true,
          }));
          window.location.href = "main.html";
        } else {
          alert(data.error || "Google signup failed");
        }
      });
  }
  
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
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
            localStorage.setItem("userSession", JSON.stringify({
              name: username,
              email,
              isLoggedIn: true,
            }));
            window.location.href = "main.html";
          } else {
            alert(data.error || "Signup failed");
          }
        });
    });
  }
  
  // Password feedback
  const passwordInput = document.getElementById("signup-password");
  const feedbackBox = document.getElementById("password-feedback");
  const strengthText = document.getElementById("password-strength").querySelector("span");
  const strengthBar = document.getElementById("strength-bar");
  
  if (passwordInput) {
    // Show/hide logic depending on focus
    document.addEventListener("focusin", (e) => {
      if (e.target === passwordInput) {
        if (passwordInput.value.trim() !== "") {
          feedbackBox.style.display = "block";
          strengthBar.parentElement.style.display = "block";
        }
      } else {
        feedbackBox.style.display = "none";
        strengthBar.parentElement.style.display = "none";
  
        if (passwordInput.value.trim() === "") {
          resetFeedback();
        }
      }
    });
  
    // Password input event updates feedback and strength
    passwordInput.addEventListener("input", () => {
      const password = passwordInput.value;
  
      if (password.trim() === "") {
        feedbackBox.style.display = "none";
        strengthBar.parentElement.style.display = "none";
        resetFeedback();
        return;
      }
  
      feedbackBox.style.display = "block";
      strengthBar.parentElement.style.display = "block";
  
      const hasLength = password.length >= 8;
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);
  
      updateRequirement("length", hasLength);
      updateRequirement("uppercase", hasUpper);
      updateRequirement("lowercase", hasLower);
      updateRequirement("symbol", hasSymbol);
  
      const strengthCount = [hasLength, hasUpper, hasLower, hasSymbol].filter(Boolean).length;
  
      let width = 0;
      let color = "red";
      let label = "Weak";
  
      if (strengthCount <= 2) {
        width = 33;
        color = "red";
        label = "Weak";
      } else if (strengthCount === 3) {
        width = 66;
        color = "orange";
        label = "Medium";
      } else {
        width = 100;
        color = "green";
        label = "Strong";
      }
  
      strengthText.textContent = label;
      strengthText.style.color = color;
      strengthBar.style.width = `${width}%`;
      strengthBar.style.backgroundColor = color;
    });
  
    // Updates individual rule lines
    function updateRequirement(id, condition) {
      const element = document.getElementById(id);
      if (element) {
        const label = element.dataset.text;
        if (condition) {
          element.classList.remove("invalid");
          element.classList.add("valid");
          element.textContent = `✅ ${label}`;
        } else {
          element.classList.remove("valid");
          element.classList.add("invalid");
          element.textContent = `❌ ${label}`;
        }
      }
    }
  
    // Resets all indicators
    function resetFeedback() {
      ["length", "uppercase", "lowercase", "symbol"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove("valid");
          el.classList.add("invalid");
          el.textContent = `❌ ${el.dataset.text}`;
        }
      });
      strengthText.textContent = "";
      strengthText.style.color = "black";
      strengthBar.style.width = "0%";
      strengthBar.style.backgroundColor = "transparent";
    }
  }
  
  