

const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const registerBtn = document.getElementById("registerBtn");


function setMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type || ""}`;
}

//login logic 
registerBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const username = form.username.value.trim();
  const password = form.password.value;

 if (!username || !password) {
    setMessage("Username and password are required.", "error");
    return;
  }
  submitBtn.disabled = true;
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }



    setMessage("Signed in! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "/index.html";
    }, 800);

  } catch (err) {
    setMessage(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }

})


// sign in logic 
submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    setMessage("Username and password are required.", "error");
    return;
  }

  submitBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/signIn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }



    setMessage("Signed in! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "/index.html";
    }, 800);

  } catch (err) {
    setMessage(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});