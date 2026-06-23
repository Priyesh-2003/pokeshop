const API_URL = "/api/cards"; // relative path — works when Express serves this folder + the API on the same origin

const form = document.getElementById("cardForm");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const cardGrid = document.getElementById("cardGrid");

let cardsCache = [];   // last loaded list, so Edit/Buy can look up a card's data by id
let editingId = null;  // null = "adding a new card", otherwise = id being edited

// Maps a card's "type" string to one of the accent colors defined in style.css.
// Falls back to a neutral color for anything not in the list (since the schema
// allows any free-text type).
function typeColorVar(type) {
  const known = ["fire", "water", "electric", "grass", "psychic"];
  const normalized = (type || "").toLowerCase();
  return known.includes(normalized) ? `var(--${normalized})` : "var(--default-type)";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCards(cards) {
  if (!cards.length) {
    cardGrid.innerHTML = `<p class="empty-state">No cards yet — add your first one to the left.</p>`;
    return;
  }

  cardGrid.innerHTML = cards
    .map((card) => {
      const price = typeof card.price === "number" ? card.price.toFixed(2) : "0.00";
      const stock = card.stock ?? 0;

      return `
        <article class="card" style="--type-color: ${typeColorVar(card.type)}">
          <div class="card-menu-wrap">
            <button type="button" class="card-menu-btn" aria-haspopup="true" aria-label="Card actions">⋮</button>
            <div class="card-menu" role="menu">
              <button type="button" class="edit-btn" data-id="${card._id}" role="menuitem">Edit</button>
              <button type="button" class="delete-btn danger" data-id="${card._id}" data-name="${escapeHtml(card.name)}" role="menuitem">Delete</button>
            </div>
          </div>

          <div class="card-top">
            <h3 class="card-name">${escapeHtml(card.name)}</h3>
            <span class="card-price">$${price}</span>
          </div>
          ${card.type ? `<span class="type-badge">${escapeHtml(card.type)}</span>` : ""}
          <div class="card-meta">
            <span>${card.rarity ? escapeHtml(card.rarity) : "—"}</span>
            <span>Stock: ${stock}</span>
          </div>

          <button type="button" class="buy-btn" data-id="${card._id}">Buy now</button>
        </article>`;
    })
    .join("");
}

function closeAllMenus() {
  document.querySelectorAll(".card-menu.open").forEach((m) => m.classList.remove("open"));
}

// Fetches the list, then removes (from the DB, not just the screen) any card
// that's at zero stock — covers both "bought the last one" and "manually edited
// stock down to 0" cases, so out-of-stock cards never linger in view.
async function loadCards() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const cards = await res.json();

    const inStock = cards.filter((c) => (c.stock ?? 0) > 0);
    const outOfStock = cards.filter((c) => (c.stock ?? 0) <= 0);

    if (outOfStock.length) {
      await Promise.all(
        outOfStock.map((c) =>
          fetch(`${API_URL}/${c._id}`, { method: "DELETE" }).catch(() => {
            // best-effort cleanup — if one delete fails, it'll just get retried on next load
          })
        )
      );
    }

    cardsCache = inStock;
    renderCards(inStock);
  } catch (err) {
    cardGrid.innerHTML = `<p class="empty-state">Couldn't load cards — is your backend running? (${err.message})</p>`;
  }
}

function setMessage(el, text, type) {
  el.textContent = text;
  el.className = `form-message ${type || ""}`;
}

// ===== Enter / exit edit mode =====
function startEdit(card) {
  editingId = card._id;
  form.name.value = card.name || "";
  form.type.value = card.type || "";
  form.rarity.value = card.rarity || "";
  form.price.value = card.price ?? "";
  form.stock.value = card.stock ?? "";

  formTitle.textContent = "Edit card";
  submitBtn.textContent = "Update card";
  cancelEditBtn.hidden = false;
  setMessage(formMessage, "", "");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEdit() {
  editingId = null;
  form.reset();
  formTitle.textContent = "Add a card";
  submitBtn.textContent = "Add card";
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener("click", () => {
  exitEdit();
  setMessage(formMessage, "", "");
});

// ===== Add / Update submit =====
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
    setMessage(formMessage, "Name is required.", "error");
    return;
  }

  const isEditing = Boolean(editingId);
  const url = isEditing ? `${API_URL}/${editingId}` : API_URL;
  const method = isEditing ? "PUT" : "POST";

  submitBtn.disabled = true;
  setMessage(formMessage, isEditing ? "Updating card…" : "Adding card…", "");

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded with ${res.status}`);
    }

    exitEdit();
    setMessage(formMessage, isEditing ? "Card updated." : "Card added.", "success");
    loadCards(); // refresh the list — also auto-removes it if it was edited down to 0 stock
  } catch (err) {
    setMessage(formMessage, `Couldn't ${isEditing ? "update" : "add"} card: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ===== Delete =====
async function handleDelete(id, name) {
  const confirmed = window.confirm(`Delete "${name}"? This can't be undone.`);
  if (!confirmed) return;

  setMessage(listMessage, "Deleting…", "");

  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Server responded with ${res.status}`);
    }

    if (editingId === id) exitEdit();

    setMessage(listMessage, "Card deleted.", "success");
    loadCards();
  } catch (err) {
    setMessage(listMessage, `Couldn't delete card: ${err.message}`, "error");
  }
}

// ===== Buy now =====
// If this purchase would bring stock to 0, the card is deleted outright instead
// of being updated to a 0-stock record — so sold-out cards disappear immediately.
async function handleBuy(id, buyBtn) {
  const card = cardsCache.find((c) => c._id === id);
  if (!card || (card.stock ?? 0) <= 0) return;

  const newStock = (card.stock ?? 0) - 1;
  const isLastOne = newStock <= 0;
  const originalLabel = buyBtn.textContent;

  buyBtn.disabled = true;
  buyBtn.textContent = isLastOne ? "Selling last one…" : "Buying…";

  try {
    const res = isLastOne
      ? await fetch(`${API_URL}/${id}`, { method: "DELETE" })
      : await fetch(`${API_URL}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: card.name,
            type: card.type,
            rarity: card.rarity,
            price: card.price,
            stock: newStock
          })
        });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Server responded with ${res.status}`);
    }

    setMessage(
      listMessage,
      isLastOne ? `${card.name} just sold out and was removed.` : `Bought 1× ${card.name}.`,
      "success"
    );
    loadCards();
  } catch (err) {
    setMessage(listMessage, `Couldn't complete purchase: ${err.message}`, "error");
    buyBtn.disabled = false;
    buyBtn.textContent = originalLabel;
  }
}

// ===== Event delegation for kebab menu / edit / delete / buy clicks on the grid =====
cardGrid.addEventListener("click", (e) => {
  const menuBtn = e.target.closest(".card-menu-btn");
  if (menuBtn) {
    e.stopPropagation();
    const menu = menuBtn.nextElementSibling;
    const wasOpen = menu.classList.contains("open");
    closeAllMenus();
    if (!wasOpen) menu.classList.add("open");
    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const card = cardsCache.find((c) => c._id === editBtn.dataset.id);
    closeAllMenus();
    if (card) startEdit(card);
    return;
  }

  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    closeAllMenus();
    handleDelete(deleteBtn.dataset.id, deleteBtn.dataset.name);
    return;
  }

  const buyBtn = e.target.closest(".buy-btn");
  if (buyBtn && !buyBtn.disabled) {
    handleBuy(buyBtn.dataset.id, buyBtn);
    return;
  }
});

// Close any open kebab menu when clicking anywhere else on the page
document.addEventListener("click", closeAllMenus);

loadCards();