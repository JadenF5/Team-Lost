document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("userSession"));
    console.log("User from localStorage:", user); // 🔍
  
    if (!user || !user.email) {
      console.warn("No user found in localStorage");
      return;
    }
  
    fetch(`http://127.0.0.1:5000/user/${user.email}`)
      .then(res => res.json())
      .then(data => {
        console.log("Fetched user data:", data); // 🔍
  
        if (data.first_time_user) {
          console.log("First time user! Showing popup"); // 🔍
          showPreferencePopup(); 
        } else {
          console.log("Not first time, no popup needed."); // 🔍
        }
      })
      .catch(err => {
        console.error("Error fetching user info:", err); // 🔍
      });
  });
  
  
  function showPreferencePopup() {
    const questions = [
      {
        id: "interests",
        type: "checkbox",
        question: "What types of events are you interested in?",
        options: ["Music concerts", "Tech meetups", "Food festivals", "Art & exhibitions", "Sports & outdoor activities", "Networking events", "Gaming tournaments", "Other"]
      },
      {
        id: "weekend_style",
        type: "text",
        question: "How do you usually like to spend your weekends?"
      },
      {
        id: "crowd",
        type: "checkbox",
        question: "What kind of crowd do you prefer?",
        options: ["Big lively crowds", "Small, cozy gatherings", "Doesn’t matter"]
      },
      {
        id: "timing",
        type: "checkbox",
        question: "When do you prefer going out for events?",
        options: ["Morning", "Afternoon", "Evening", "Late night"]
      },
      {
        id: "budget",
        type: "text",
        question: "What is your event budget preference?"
      },
      {
        id: "vibe",
        type: "checkbox",
        question: "What types of vibes are you into?",
        options: ["Family-friendly", "Professional", "Social & casual", "Adventure/outdoor", "Educational"]
      },
      {
        id: "radius",
        type: "range",
        question: "What’s the maximum distance you’re willing to travel for an event (in miles)?"
      },
      {
        id: "additional_info",
        type: "text",
        question: "Anything else you'd like us to know about you?"
      }
    ];
  
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    document.body.appendChild(overlay);
  
    // Create popup
    const popup = document.createElement("div");
    popup.id = "preference-popup";
    popup.innerHTML = `<h2>Your Preferences</h2>`;
  
    questions.forEach(q => {
      const wrapper = document.createElement("div");
      wrapper.className = "question";
      wrapper.innerHTML += `<label><strong>${q.question}</strong></label>`;
  
      if (q.type === "checkbox") {
        q.options.forEach(opt => {
          wrapper.innerHTML += `<label><input type="checkbox" name="${q.id}" value="${opt}"> ${opt}</label>`;
        });
      } else if (q.type === "range") {
        wrapper.innerHTML += `<input type="range" id="${q.id}" name="${q.id}" min="1" max="100" />`;
      } else {
        wrapper.innerHTML += `<input type="text" id="${q.id}" name="${q.id}" />`;
      }
  
      popup.appendChild(wrapper);
    });
  
    popup.innerHTML += `<button id="submit-preferences">Submit</button>`;
    document.body.appendChild(popup);
    document.body.classList.add("blurred");
  
    // Submit handler
    document.getElementById("submit-preferences").addEventListener("click", () => {
      const answers = {};
      questions.forEach(q => {
        if (q.type === "checkbox") {
          answers[q.id] = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(el => el.value);
        } else {
          const el = document.getElementById(q.id);
          answers[q.id] = el ? el.value : "";
        }
      });
  
      const user = JSON.parse(localStorage.getItem("userSession"));
  
      fetch("http://127.0.0.1:5000/submit-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, preferences: answers })
      }).then(() => {
        popup.remove();
        overlay.remove();
        document.body.classList.remove("blurred");
      });
    });
  }
  
  