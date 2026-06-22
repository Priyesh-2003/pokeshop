const API_URL = "/api/cards"; // relative path — works when Express serves this folder + the API on the same origin

const form = document.getElementById("cardForm");
const submitBtn = document.getElementById("submitBtn");
const formMessage = document.getElementById("formMessage");
const cardGrid = document.getElementById("cardGrid");

// Maps a card's "type" string to one of the accent colors defined in style.css.
// Falls back to a neutral color for anything not in the list (since the schema
// allows any free-text type).
function typeColorVar(type) {
  const known = ["fire", "water", "electric", "grass", "psychic"];
  const normalized = (type || "").toLowerCase();
  return known.includes(normalized) ? `var(--${normalized})` : "var(--default-type)";
}

function renderCards(cards) {
  if (!cards.length) {
    cardGrid.innerHTML = `<p class="empty-state">No cards yet — add your first one to the left.</p>`;
    return;
  }

  cardGrid.innerHTML = cards
    .map((card) => {
      const price = typeof card.price === "number" ? card.price.toFixed(2) : "0.00";
      return `
        <article class="card" style="--type-color: ${typeColorVar(card.type)}">
          <div class="card-top">
            <h3 class="card-name">${escapeHtml(card.name)}</h3>
            <span class="card-price">$${price}</span>
          </div>
          ${card.type ? `<span class="type-badge">${escapeHtml(card.type)}</span>` : ""}
          <div class="card-meta">
            <span>${card.rarity ? escapeHtml(card.rarity) : "—"}</span>
            <span>Stock: ${card.stock ?? 0}</span>
          </div>
        </article>`;
    })
    .join("");
}

// Basic escaping so a card name/type/rarity can't break the markup
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function loadCards() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const cards = await res.json();
    renderCards(cards);
  } catch (err) {
    cardGrid.innerHTML = `<p class="empty-state">Couldn't load cards — is your backend running? (${err.message})</p>`;
  }
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type || ""}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const payload = {
    name: data.get("name").trim(),
    type: data.get("type").trim(),
    rarity: data.get("rarity").trim(),
    price: data.get("price") ? Number(data.get("price")) : 0,
    stock: data.get("stock") ? Number(data.get("stock")) : 1
  };

  if (!payload.name) {
    setMessage("Name is required.", "error");
    return;
  }

  submitBtn.disabled = true;
  setMessage("Adding card…", "");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded with ${res.status}`);
    }

    form.reset();
    setMessage("Card added.", "success");
    loadCards(); // refresh the list from the database so it reflects what's actually stored
  } catch (err) {
    setMessage(`Couldn't add card: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

loadCards();