google.accounts.id.initialize({
    client_id: "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });
  
  google.accounts.id.renderButton(
    document.getElementById("google-login-btn"),
    {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular"
    }
  );
  
  function handleGoogleLogin(response) {
    const token = response.credential;
  
    fetch("http://127.0.0.1:5000/login/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem("userSession", JSON.stringify({
            name: data.user?.username || data.user?.name,
            email: data.user?.email,
            isLoggedIn: true,
          }));
          window.location.href = "main.html";
        } else {
          alert(data.error || "Google login failed");
        }
      });
  }
  
  const signinForm = document.getElementById("signin-form");
  if (signinForm) {
    signinForm.addEventListener("submit", (e) => {
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
            localStorage.setItem("userSession", JSON.stringify({
              name: data.user.username,
              email: data.user.email,
              isLoggedIn: true,
            }));
            window.location.href = "main.html";
          } else {
            alert(data.error || "Login failed");
          }
        });
    });
  }
  