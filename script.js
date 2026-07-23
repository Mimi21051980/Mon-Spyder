const checklistDefaults = [
  "Permis de conduire","Carte d’assurance","Téléphone chargé","Sena connecté",
  "CarPlay connecté","Casque","Gants","Manteau","Bottes","Lunettes",
  "Essence","Pression des pneus","Aucun voyant allumé","Coffres fermés","Eau ou collation"
];

const challengeDefaults = [
  "Première sortie seule","Premier plein","Premier 100 km","Premier pont",
  "Première autoroute","Première ride de groupe","Ride de Filles","5 000 km","10 000 km"
];

const state = {
  rides: JSON.parse(localStorage.getItem("spyderRides") || "[]"),
  routes: JSON.parse(localStorage.getItem("spyderRoutes") || "[]"),
  maintenance: JSON.parse(localStorage.getItem("spyderMaintenance") || '{"mileage":0,"oil":0,"notes":""}'),
  challenges: JSON.parse(localStorage.getItem("spyderChallenges") || "{}")
};

function save() {
  localStorage.setItem("spyderRides", JSON.stringify(state.rides));
  localStorage.setItem("spyderRoutes", JSON.stringify(state.routes));
  localStorage.setItem("spyderMaintenance", JSON.stringify(state.maintenance));
  localStorage.setItem("spyderChallenges", JSON.stringify(state.challenges));
}

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour Émilie ☀️";
  if (hour < 18) return "Bon après-midi Émilie 🌤️";
  return "Bonne soirée Émilie 🌙";
}

function goTo(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(
    b => b.classList.toggle("active", b.dataset.go === id)
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

document.addEventListener("click", e => {
  const button = e.target.closest("[data-go]");
  if (button) goTo(button.dataset.go);
});

function renderChecklist() {
  const box = document.getElementById("checklistItems");
  box.innerHTML = "";
  checklistDefaults.forEach((item, index) => {
    const row = document.createElement("label");
    row.className = "check-row";
    row.innerHTML = `<input type="checkbox" data-check="${index}"><span>${item}</span>`;
    box.appendChild(row);
  });
  box.querySelectorAll("input").forEach(input => input.addEventListener("change", updateReady));
  updateReady();
}

function updateReady() {
  const checks = [...document.querySelectorAll("[data-check]")];
  const done = checks.filter(c => c.checked).length;
  document.getElementById("readyButton").disabled = done !== checks.length;
  document.getElementById("checkProgress").textContent = `${done} / ${checks.length}`;
  document.getElementById("progressFill").style.width = `${(done / checks.length) * 100}%`;
}

document.getElementById("readyButton").addEventListener("click", () => goTo("success"));
document.getElementById("resetChecklist").addEventListener("click", () => {
  document.querySelectorAll("[data-check]").forEach(c => c.checked = false);
  updateReady();
});

document.getElementById("newRideButton").addEventListener("click", () => {
  document.querySelector('#rideForm [name="date"]').value = new Date().toISOString().slice(0, 10);
  goTo("newRide");
});

document.getElementById("rideForm").addEventListener("submit", e => {
  e.preventDefault();
  state.rides.unshift(Object.fromEntries(new FormData(e.target).entries()));
  save();
  e.target.reset();
  goTo("journal");
});

function formatDate(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function renderRides() {
  const list = document.getElementById("rideList");
  list.innerHTML = "";

  if (!state.rides.length) {
    list.innerHTML = '<div class="empty-message">Ta prochaine aventure apparaîtra ici. ♥</div>';
  }

  state.rides.forEach((ride, index) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `
      <div class="row">
        <h3>${ride.name}</h3>
        <button class="delete-button" data-delete-ride="${index}">Supprimer</button>
      </div>
      <p>${formatDate(ride.date)} · ${ride.distance || 0} km ${ride.duration ? `· ${ride.duration}` : ""}</p>
      <p>♥ Plaisir ${ride.fun}/10 · Confiance ${ride.confidence}/10</p>
      ${ride.favorite ? `<p>Moment préféré : ${ride.favorite}</p>` : ""}
      ${ride.notes ? `<p>${ride.notes}</p>` : ""}
    `;
    list.appendChild(card);
  });

  const total = state.rides.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
  const average = state.rides.length
    ? state.rides.reduce((sum, r) => sum + (Number(r.confidence) || 0), 0) / state.rides.length
    : 0;

  document.getElementById("rideCount").textContent = state.rides.length;
  document.getElementById("homeRideCount").textContent = state.rides.length;
  document.getElementById("totalDistance").textContent = `${total} km`;
  document.getElementById("averageConfidence").textContent = state.rides.length ? `${average.toFixed(1)}/10` : "—";
  document.getElementById("lastRide").textContent = state.rides.length ? state.rides[0].name : "Aucune";
}

document.addEventListener("click", e => {
  const button = e.target.closest("[data-delete-ride]");
  if (button && confirm("Supprimer cette sortie?")) {
    state.rides.splice(Number(button.dataset.deleteRide), 1);
    save();
    renderRides();
  }
});

document.getElementById("maintenanceForm").addEventListener("submit", e => {
  e.preventDefault();
  state.maintenance = {
    mileage: Number(document.getElementById("mileageInput").value) || 0,
    oil: Number(document.getElementById("oilInput").value) || 0,
    notes: document.getElementById("maintenanceNotes").value
  };
  save();
  renderMaintenance();
});

function renderMaintenance() {
  const { mileage = 0, oil = 0, notes = "" } = state.maintenance;
  document.getElementById("mileageInput").value = mileage || "";
  document.getElementById("oilInput").value = oil || "";
  document.getElementById("maintenanceNotes").value = notes;
  document.getElementById("homeMileage").textContent = `${mileage} km`;
  document.getElementById("vehicleMileage").textContent = `${mileage} km`;

  const status = document.getElementById("oilStatus");
  const remaining = oil - mileage;

  if (!oil) {
    status.innerHTML = "<strong>Prochain entretien à définir</strong><p>Ajoute le kilométrage du prochain changement d’huile.</p>";
    document.getElementById("nextMaintenance").textContent = "À définir";
  } else if (remaining > 0) {
    status.innerHTML = `<strong>Entretien à ${oil} km</strong><p>Il reste environ ${remaining} km.</p>`;
    document.getElementById("nextMaintenance").textContent = `${remaining} km`;
  } else {
    status.innerHTML = "<strong>Entretien à prévoir</strong><p>Le kilométrage prévu est atteint.</p>";
    document.getElementById("nextMaintenance").textContent = "Maintenant";
  }
}

document.getElementById("routeForm").addEventListener("submit", e => {
  e.preventDefault();
  state.routes.unshift(Object.fromEntries(new FormData(e.target).entries()));
  save();
  e.target.reset();
  renderRoutes();
});

function renderRoutes() {
  const list = document.getElementById("routeList");
  list.innerHTML = "";

  if (!state.routes.length) {
    list.innerHTML = '<div class="empty-message">Ajoute ici les routes que tu aimerais refaire.</div>';
  }

  state.routes.forEach((route, index) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `
      <div class="row">
        <h3>${route.name}</h3>
        <button class="delete-button" data-delete-route="${index}">Supprimer</button>
      </div>
      <p>${route.distance || 0} km · ${route.difficulty}</p>
    `;
    list.appendChild(card);
  });
}

document.addEventListener("click", e => {
  const button = e.target.closest("[data-delete-route]");
  if (button && confirm("Supprimer ce parcours?")) {
    state.routes.splice(Number(button.dataset.deleteRoute), 1);
    save();
    renderRoutes();
  }
});

function renderChallenges() {
  const list = document.getElementById("challengeList");
  list.innerHTML = "";

  challengeDefaults.forEach((challenge, index) => {
    const done = Boolean(state.challenges[index]);
    const row = document.createElement("label");
    row.className = "challenge";
    row.innerHTML = `
      <input type="checkbox" data-challenge="${index}" ${done ? "checked" : ""}>
      <span>${done ? "★" : "☆"} ${challenge}</span>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", e => {
      state.challenges[e.target.dataset.challenge] = e.target.checked;
      save();
      renderChallenges();
    });
  });
}

function renderAll() {
  document.getElementById("greeting").textContent = greetingText();
  document.getElementById("seasonYear").textContent = new Date().getFullYear();
  renderRides();
  renderMaintenance();
  renderRoutes();
  renderChallenges();
}

renderChecklist();
renderAll();
