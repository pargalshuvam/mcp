document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authBtn = document.getElementById("auth-btn");
  const authStatusText = document.getElementById("auth-status-text");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const cancelLogin = document.getElementById("cancel-login");
  const signupContainer = document.getElementById("signup-container");

  // --- Auth helpers ---
  function getToken() {
    return sessionStorage.getItem("auth_token");
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function authHeaders() {
    return isLoggedIn()
      ? { Authorization: `Bearer ${getToken()}` }
      : {};
  }

  function updateAuthUI() {
    const username = sessionStorage.getItem("auth_username");
    if (isLoggedIn()) {
      authStatusText.textContent = `Logged in as ${username}`;
      authBtn.textContent = "⬡ Logout";
      signupContainer.classList.remove("hidden");
    } else {
      authStatusText.textContent = "";
      authBtn.textContent = "👤 Login";
      signupContainer.classList.add("hidden");
    }
    fetchActivities();
  }

  // --- Auth button click: login or logout ---
  authBtn.addEventListener("click", async () => {
    if (isLoggedIn()) {
      await fetch("/auth/logout", {
        method: "POST",
        headers: authHeaders(),
      });
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_username");
      updateAuthUI();
    } else {
      loginModal.classList.remove("hidden");
    }
  });

  cancelLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginError.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        sessionStorage.setItem("auth_token", result.token);
        sessionStorage.setItem("auth_username", result.username);
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginError.classList.add("hidden");
        updateAuthUI();
      } else {
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  // --- Activities ---
  async function fetchActivities() {
    // Reset dropdown options (keep placeholder)
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${isLoggedIn() ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE", headers: authHeaders() }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST", headers: authHeaders() }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize
  updateAuthUI();
});
