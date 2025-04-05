document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("userSession"));
    console.log("User from localStorage:", user); // 🔍
  
    if (!user || !user.email) {
      console.warn("No user found in localStorage");
      document.body.classList.remove("blurred", "hide-content");
      return;
    }
  
    fetch(`http://127.0.0.1:5000/user/${user.email}`)
    .then(res => res.json())
    .then(data => {
      if (data.first_time_user) {
        showPreferencePopup();
      } else {
        document.body.classList.remove("blurred", "hide-content");
      }
    })
    .catch(err => {
      console.error("Failed to fetch user:", err);
      document.body.classList.remove("blurred", "hide-content");
    });
  });
  
  
  function showPreferencePopup() {
    const user = JSON.parse(localStorage.getItem("userSession"));
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
        question: "What is your event budget preference?",
        validate: value => /^\d+$/.test(value) || "Please enter a valid number"
      },
      {
        id: "vibe",
        type: "checkbox",
        question: "What types of vibes are you into?",
        options: ["Family-friendly", "Professional", "Social & casual", "Adventure/outdoor", "Educational"]
      },
      {
        id: "radius",
        type: "text",
        question: "What’s the max distance you’re willing to travel for an event (in miles)?",
        validate: value => /^\d+$/.test(value) || "Please enter a valid number"
      },
      {
        id: "additional_info",
        type: "text",
        question: "Anything else you'd like us to know about you?"
      }
    ];
  
    let current = 0;
    const answers = {};
  
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
  
    const popup = document.createElement("div");
    popup.id = "preference-popup";
  
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-bar-container";
  
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
  
    progressContainer.appendChild(progressBar);
    popup.appendChild(progressContainer);
  
    function renderQuestion(index) {
      popup.querySelectorAll(".question").forEach(q => q.remove());
      popup.querySelectorAll(".popup-nav-btn").forEach(b => b.remove());
  
      const q = questions[index];
      const wrapper = document.createElement("div");
      wrapper.className = "question";
  
      wrapper.innerHTML += `<label>${q.question}</label>`;
  
      if (q.type === "checkbox") {
        q.options.forEach(opt => {
          wrapper.innerHTML += `
            <label style="display:block;text-align:left;margin:5px 0;">
              <input type="checkbox" name="${q.id}" value="${opt}" /> ${opt}
            </label>`;
        });
      } else {
        wrapper.innerHTML += `<input type="text" id="${q.id}" name="${q.id}" />`;
      }
  
      popup.appendChild(wrapper);
  
      const nextBtn = document.createElement("button");
      nextBtn.className = "popup-nav-btn";
      nextBtn.innerText = index === questions.length - 1 ? "Submit" : "Next";
  
      nextBtn.onclick = () => {
        if (q.type !== "checkbox") {
          const inputVal = document.getElementById(q.id).value;
          if (!inputVal.trim()) {
            alert("Please fill in the field.");
            return;
          }
  
          if ((q.id === "budget" || q.id === "radius") && isNaN(inputVal)) {
            alert(`${q.id.charAt(0).toUpperCase() + q.id.slice(1)} must be a number`);
            return;
          }
  
          answers[q.id] = inputVal.trim();
        } else {
          const checked = [...popup.querySelectorAll(`input[name="${q.id}"]:checked`)].map(c => c.value);
          if (checked.length === 0) {
            alert("Please select at least one option.");
            return;
          }
          answers[q.id] = checked;
        }
  
        current++;
        if (current < questions.length) {
          updateProgressBar();
          renderQuestion(current);
        } else {
          submitPreferences();
        }
      };
  
      popup.appendChild(nextBtn);
      updateProgressBar();
    }
  
    function updateProgressBar() {
      const progress = ((current) / questions.length) * 100;
      progressBar.style.width = `${progress}%`;
    }
  
    function submitPreferences() {
      const user = JSON.parse(localStorage.getItem("userSession"));
  
      fetch("http://127.0.0.1:5000/submit-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, preferences: answers })
      }).then(() => {
        overlay.remove();
        popup.remove();
        document.body.classList.remove("blurred");
        document.body.classList.remove("hide-content");
      });
    }
  
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    document.body.classList.add("blurred");
    document.body.classList.add("hide-content");
  
    renderQuestion(current);
  }