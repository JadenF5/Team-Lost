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
  
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
  
    const popup = document.createElement("div");
    popup.id = "preference-popup";
  
    const questionContainer = document.createElement("div");
    questionContainer.id = "question-container";
  
    const error = document.createElement("p");
    error.style.color = "red";
  
    popup.appendChild(questionContainer);
    popup.appendChild(error);
  
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    popup.appendChild(nextBtn);
  
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    document.body.classList.add("blurred");
  
    let current = 0;
    const answers = {};
  
    const renderQuestion = () => {
      questionContainer.innerHTML = "";
      error.textContent = "";
  
      const q = questions[current];
      const label = document.createElement("label");
      label.innerHTML = `<strong>${q.question}</strong>`;
      questionContainer.appendChild(label);
  
      if (q.type === "checkbox") {
        q.options.forEach(opt => {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = q.id;
          checkbox.value = opt;
  
          const lbl = document.createElement("label");
          lbl.appendChild(checkbox);
          lbl.append(` ${opt}`);
          questionContainer.appendChild(lbl);
        });
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.id = q.id;
        questionContainer.appendChild(input);
      }
  
      if (current === questions.length - 1) {
        nextBtn.textContent = "Submit";
      }
    };
  
    renderQuestion();
  
    nextBtn.addEventListener("click", () => {
      const q = questions[current];
      error.textContent = "";
  
      if (q.type === "checkbox") {
        const selected = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(el => el.value);
        answers[q.id] = selected;
      } else {
        const val = document.getElementById(q.id).value.trim();
        if (q.validate) {
          const valid = q.validate(val);
          if (valid !== true) {
            error.textContent = valid;
            return;
          }
        }
        answers[q.id] = val;
      }
  
      current++;
  
      if (current >= questions.length) {
        // Done, submit preferences
        fetch("http://127.0.0.1:5000/submit-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, preferences: answers })
        }).then(() => {
          popup.remove();
          overlay.remove();
          document.body.classList.remove("blurred");
          document.body.classList.remove("hide-content");
        });
      } else {
        renderQuestion();
      }
    });
  }
  
  
  