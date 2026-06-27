const API_URL = "/api/cards"; // relative path — works when Express serves this folder + the API on the same origin
const token = localStorage.getItem("token");
const form = document.getElementById("cardForm");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const cardGrid = document.getElementById("cardGrid");

// Cart elements
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartOverlay = document.getElementById("cartOverlay");
const cartDrawer = document.getElementById("cartDrawer");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const cartMessage = document.getElementById("cartMessage");

let cardsCache = [];   // ALL cards from the DB (including zero-stock ones reserved in carts)
let editingId = null;  // null = "adding a new card", otherwise = id being edited
let cart = new Map();  // id -> quantity

// ===== Cart persistence (per-browser, survives reloads) =====
const CART_STORAGE_KEY = "pokeshop-cart";

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (Array.isArray(entries)) {
      cart = new Map(entries);
    }
  } catch {
    cart = new Map();
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
  } catch {
    // storage unavailable — cart just won't persist across reloads
  }
}

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

function formatPrice(value) {
  return (typeof value === "number" ? value : 0).toFixed(2);
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
      const inCart = cart.get(card._id) || 0;
      const cartMaxedOut = stock <= 0; // no remaining stock in DB

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
          <button type="button" class="cart-btn" data-id="${card._id}" ${cartMaxedOut ? "disabled" : ""}>
            ${inCart > 0 ? `In cart · ${inCart}` : "Add to Cart"}
          </button>
        </article>`;
    })
    .join("");
}

function closeAllMenus() {
  document.querySelectorAll(".card-menu.open").forEach((m) => m.classList.remove("open"));
}

async function loadCards() {
  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const cards = await res.json();

    // Cache ALL cards so the cart can still look up zero-stock ones by id
    cardsCache = cards;

    // Only show cards that still have stock available in the grid
    const inStock = cards.filter((c) => (c.stock ?? 0) > 0);

    reconcileCart();
    renderCards(inStock);
    renderCart();
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded with ${res.status}`);
    }

    exitEdit();
    setMessage(formMessage, isEditing ? "Card updated." : "Card added.", "success");
    loadCards();
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
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Server responded with ${res.status}`);
    }

    if (editingId === id) exitEdit();
    if (cart.has(id)) {
      cart.delete(id);
      saveCartToStorage();
    }

    setMessage(listMessage, "Card deleted.", "success");
    loadCards();
  } catch (err) {
    setMessage(listMessage, `Couldn't delete card: ${err.message}`, "error");
  }
}

async function startPayment(cardId) {
  try {
    const card = cardsCache.find(c => c._id === cardId);
    if (!card) return;

    const response = await fetch(`/api/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount: card.price })
    });

    const order = await response.json();

    const options = {
      key: "rzp_test_T6KyRt4iuSs27s",
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "Pokemon Store",
      handler: async function (response) {
        // Called automatically by Razorpay after a successful payment.
        // `response` contains:
        // - razorpay_payment_id
        // - razorpay_order_id
        // - razorpay_signature
        const verifyResponse = await fetch(`/api/payments/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(response)
        });
        const data = await verifyResponse.json();
        console.log(data);  
        // if(data.message === "Payment successful"){
        //   setMessage(listMessage, "Payment successful", "success");
        // }else{
        //   setMessage(listMessage, "Payment failed", "error");
        // }

      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("startPayment failed:", err);
  }
}


// ===== Cart: add / change quantity / remove =====
async function addToCart(id) {
  const card = cardsCache.find((c) => c._id === id);
  if (!card) return;

  const stock = card.stock ?? 0;
  const current = cart.get(id) || 0;

  if (stock <= 0) {
    setMessage(listMessage, `No more ${card.name} left to add.`, "error");
    return;
  }

  const newStock = stock - 1;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: card.name, type: card.type, rarity: card.rarity, price: card.price, stock: newStock }),
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    cart.set(id, current + 1);
    saveCartToStorage();
    await loadCards();
    setMessage(listMessage, `Added ${card.name} to cart.`, "success");
  } catch (err) {
    setMessage(listMessage, `Couldn't add to cart: ${err.message}`, "error");
  }
}

async function changeCartQty(id, delta) {
  const card = cardsCache.find((c) => c._id === id);
  if (!card) return;

  const current = cart.get(id) || 0;
  const stock = card.stock ?? 0;

  // Can't increase if nothing left in stock; can't decrease below 0 in cart
  if (delta > 0 && stock <= 0) return;
  if (delta < 0 && current <= 0) return;

  // delta=+1 → reserve one more from DB; delta=-1 → return one to DB
  const newStock = stock - delta;
  const next = current + delta;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: card.name, type: card.type, rarity: card.rarity, price: card.price, stock: newStock }),
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    if (next <= 0) {
      cart.delete(id);
    } else {
      cart.set(id, next);
    }

    saveCartToStorage();
    await loadCards();
  } catch (err) {
    setMessage(listMessage, `Couldn't update cart: ${err.message}`, "error");
  }
}

async function removeFromCart(id) {
  const qty = cart.get(id) || 0;
  if (!qty) return;

  const card = cardsCache.find((c) => c._id === id);

  try {
    if (card) {
      // Restore all reserved units back to DB stock
      const restoredStock = (card.stock ?? 0) + qty;
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: card.name, type: card.type, rarity: card.rarity, price: card.price, stock: restoredStock }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    }

    cart.delete(id);
    saveCartToStorage();
    await loadCards();
  } catch (err) {
    setMessage(listMessage, `Couldn't remove from cart: ${err.message}`, "error");
  }
}

// Drops cart entries for cards that were fully deleted from the DB.
// No quantity capping — DB stock already reflects units reserved in carts.
function reconcileCart() {
  let changed = false;

  for (const [id] of Array.from(cart.entries())) {
    const card = cardsCache.find((c) => c._id === id);
    if (!card) {
      cart.delete(id);
      changed = true;
    }
  }

  if (changed) saveCartToStorage();
}

// ===== Cart: rendering =====
function renderCart() {
  const entries = Array.from(cart.entries())
    .map(([id, qty]) => ({ id, qty, card: cardsCache.find((c) => c._id === id) }))
    .filter((entry) => entry.card);

  const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
  cartCount.textContent = String(totalQty);
  cartCount.classList.toggle("hidden", totalQty === 0);

  if (!entries.length) {
    cartItemsEl.innerHTML = `<p class="empty-state">Your cart is empty.</p>`;
    cartTotalEl.textContent = "$0.00";
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;

  cartItemsEl.innerHTML = entries
    .map(({ id, qty, card }) => {
      const lineTotal = (card.price || 0) * qty;
      total += lineTotal;
      const stock = card.stock ?? 0;

      return `
        <div class="cart-item">
          <span class="cart-item-name">${escapeHtml(card.name)}</span>
          <span class="cart-item-line">$${formatPrice(lineTotal)}</span>
          <div class="cart-item-qty">
            <button type="button" class="qty-btn cart-qty-decrease" data-id="${id}" aria-label="Decrease quantity">−</button>
            <span class="cart-item-qty-value">${qty}</span>
            <button type="button" class="qty-btn cart-qty-increase" data-id="${id}" aria-label="Increase quantity" ${stock <= 0 ? "disabled" : ""}>+</button>
            <button type="button" class="remove-from-cart-btn" data-id="${id}">Remove</button>
          </div>
        </div>`;
    })
    .join("");

  cartTotalEl.textContent = `$${formatPrice(total)}`;
  checkoutBtn.disabled = false;
}

// ===== Cart: drawer open/close =====
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

cartBtn.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

cartItemsEl.addEventListener("click", (e) => {
  const increaseBtn = e.target.closest(".cart-qty-increase");
  if (increaseBtn) {
    changeCartQty(increaseBtn.dataset.id, 1);
    return;
  }

  const decreaseBtn = e.target.closest(".cart-qty-decrease");
  if (decreaseBtn) {
    changeCartQty(decreaseBtn.dataset.id, -1);
    return;
  }

  const removeBtn = e.target.closest(".remove-from-cart-btn");
  if (removeBtn) {
    removeFromCart(removeBtn.dataset.id);
  }
});

// ===== Cart: checkout =====
checkoutBtn.addEventListener("click", () => {
  const entries = Array.from(cart.entries())
    .map(([id, qty]) => ({ id, qty, card: cardsCache.find((c) => c._id === id) }))
    .filter((entry) => entry.card && entry.qty > 0);

  if (!entries.length) return;

  const itemCount = entries.reduce((sum, e) => sum + e.qty, 0);
  const names = entries.map((e) => e.card.name);

  cart.clear();
  saveCartToStorage();

  setMessage(cartMessage, `Order placed — ${itemCount} card${itemCount === 1 ? "" : "s"} purchased.`, "success");
  setMessage(listMessage, `Checked out: ${names.join(", ")}.`, "success");
  loadCards();
});

// ===== Event delegation for kebab menu / edit / delete / buy / cart clicks on the grid =====
cardGrid.addEventListener("click", (e) => {
  console.log("grid clicked, target:", e.target);
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
    startPayment(buyBtn.dataset.id);
    return;
  }
  const cartBtnEl = e.target.closest(".cart-btn");
  if (cartBtnEl && !cartBtnEl.disabled) {
    addToCart(cartBtnEl.dataset.id);
    return;
  }
});

// Close any open kebab menu when clicking anywhere else on the page
document.addEventListener("click", closeAllMenus);

loadCartFromStorage();
loadCards();