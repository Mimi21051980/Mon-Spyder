const checklistDefaults=["Permis de conduire","Carte d’assurance","Téléphone chargé","Sena connecté","CarPlay connecté","Casque","Gants","Manteau","Bottes","Lunettes","Essence","Pression des pneus","Aucun voyant allumé","Coffres fermés","Eau ou collation"];
const challengeDefaults=["Première sortie seule","Premier plein","Premier 100 km","Premier pont","Première autoroute","Première ride de groupe","Ride de Filles","5 000 km","10 000 km"];
const parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const state={
  rides:parse("spyderV4Rides",[]),
  routes:parse("spyderV4Routes",[]),
  maintenance:parse("spyderV4Maintenance",{mileage:0,next:0,fuel:78,notes:""}),
  challenges:parse("spyderV4Challenges",{}),
  settings:parse("spyderV4Settings",{temp:"24°C",weather:"Ensoleillé"})
};
function save(){
  localStorage.setItem("spyderV4Rides",JSON.stringify(state.rides));
  localStorage.setItem("spyderV4Routes",JSON.stringify(state.routes));
  localStorage.setItem("spyderV4Maintenance",JSON.stringify(state.maintenance));
  localStorage.setItem("spyderV4Challenges",JSON.stringify(state.challenges));
  localStorage.setItem("spyderV4Settings",JSON.stringify(state.settings));
}
function goTo(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target=document.getElementById(pageId);
  if(target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===pageId));
  window.scrollTo({top:0,behavior:"smooth"});
  document.querySelectorAll(".mobile-nav button").forEach(n=>n.classList.toggle("mobile-active",n.dataset.page===pageId));
  renderAll();
}
document.addEventListener("click",e=>{
  const button=e.target.closest("[data-page]");
  if(button) goTo(button.dataset.page);
});
function getGreeting(){
  const hour=new Date().getHours();
  if(hour<12) return "☀ Bonjour Émilie !";
  if(hour<18) return "🌤 Bon après-midi Émilie !";
  return "🌙 Bonne soirée Émilie !";
}
function formatDate(date){
  return new Date(date+"T12:00:00").toLocaleDateString("fr-CA",{day:"numeric",month:"long",year:"numeric"});
}
function renderChecklist(){
  const box=document.getElementById("checklistItems");
  box.innerHTML="";
  checklistDefaults.forEach((item,index)=>{
    const row=document.createElement("label");
    row.className="check-row";
    row.innerHTML=`<input type="checkbox" data-check="${index}"><span>${item}</span>`;
    box.appendChild(row);
  });
  box.querySelectorAll("input").forEach(i=>i.addEventListener("change",updateChecklist));
  updateChecklist();
}
function updateChecklist(){
  const checks=[...document.querySelectorAll("[data-check]")];
  const done=checks.filter(c=>c.checked).length;
  document.getElementById("checkCount").textContent=`${done} / ${checks.length}`;
  document.getElementById("progressFill").style.width=`${(done/checks.length)*100}%`;
  document.getElementById("readyBtn").disabled=done!==checks.length;
}
document.getElementById("resetChecklist").addEventListener("click",()=>{
  document.querySelectorAll("[data-check]").forEach(c=>c.checked=false);
  updateChecklist();
});
let rideStartedAt = null;
let rideTimerInterval = null;
let rideWatchId = null;
let ridePaused = false;
let ridePausedAt = null;
let rideTotalPausedMs = 0;
let rideDistanceKm = 0;
let rideLastPosition = null;
let rideWeather = "";
let rideFinishedDuration = "";

function formatRideDuration(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getRideSeconds() {
  if (!rideStartedAt) return 0;

  const endTime = ridePaused && ridePausedAt ? ridePausedAt : Date.now();
  return Math.max(
    0,
    Math.floor((endTime - rideStartedAt - rideTotalPausedMs) / 1000)
  );
}

function updateRideTimer() {
  document.getElementById("rideTimer").textContent =
    formatRideDuration(getRideSeconds());
}

function updateRideDistance() {
  document.getElementById("rideDistance").textContent =
    `${rideDistanceKm.toFixed(1).replace(".", ",")} km`;
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = value => value * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function handleRidePosition(position) {
  if (ridePaused) return;

  const current = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: position.coords.accuracy
  };

  // Ignore les positions trop imprécises.
  if (current.accuracy > 50) return;

  if (rideLastPosition) {
    const segment = distanceBetween(
      rideLastPosition.lat,
      rideLastPosition.lon,
      current.lat,
      current.lon
    );

    // Évite d'ajouter les petits mouvements causés par l'imprécision GPS.
    if (segment >= 0.01 && segment <= 2) {
      rideDistanceKm += segment;
      updateRideDistance();
    }
  }

  rideLastPosition = current;
}

function handleRideGpsError(error) {
  console.warn("GPS :", error.message);
  document.getElementById("rideDistance").textContent = "GPS indisponible";
}

function startGpsTracking() {
  if (!navigator.geolocation) {
    document.getElementById("rideDistance").textContent = "GPS indisponible";
    return;
  }

  if (rideWatchId !== null) {
    navigator.geolocation.clearWatch(rideWatchId);
  }

  rideWatchId = navigator.geolocation.watchPosition(
    handleRidePosition,
    handleRideGpsError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    }
  );
}

function stopGpsTracking() {
  if (rideWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(rideWatchId);
    rideWatchId = null;
  }
}

async function loadRideWeather() {
  const weatherElement = document.getElementById("rideWeather");
  weatherElement.textContent = "Recherche...";

  if (!navigator.geolocation) {
    weatherElement.textContent = "Indisponible";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code&timezone=auto`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Météo indisponible");

        const data = await response.json();
        const temperature = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;

        const descriptions = {
          0: "Dégagé",
          1: "Plutôt dégagé",
          2: "Partiellement nuageux",
          3: "Nuageux",
          45: "Brouillard",
          48: "Brouillard",
          51: "Bruine légère",
          53: "Bruine",
          55: "Bruine forte",
          61: "Pluie légère",
          63: "Pluie",
          65: "Forte pluie",
          71: "Neige légère",
          73: "Neige",
          75: "Forte neige",
          80: "Averses légères",
          81: "Averses",
          82: "Fortes averses",
          95: "Orage",
          96: "Orage",
          99: "Orage"
        };

        rideWeather = `${descriptions[code] || "Conditions variables"}, ${temperature} °C`;
        weatherElement.textContent = rideWeather;
      } catch (error) {
        console.warn("Météo :", error);
        rideWeather = "";
        weatherElement.textContent = "Indisponible";
      }
    },
    () => {
      rideWeather = "";
      weatherElement.textContent = "Indisponible";
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }
  );
}

document.getElementById("readyBtn").addEventListener("click", () => {
  rideStartedAt = Date.now();
  ridePaused = false;
  ridePausedAt = null;
  rideTotalPausedMs = 0;
  rideDistanceKm = 0;
  rideLastPosition = null;
  rideWeather = "";
  rideFinishedDuration = "";

  document.getElementById("pauseRideBtn").textContent = "⏸ Faire une pause";
  document.getElementById("pauseRideBtn").classList.remove("is-paused");
  document.getElementById("rideTimerLabel").textContent = "Temps de conduite";

  updateRideTimer();
  updateRideDistance();

  clearInterval(rideTimerInterval);
  rideTimerInterval = setInterval(updateRideTimer, 1000);

  goTo("rideMode");
  startGpsTracking();
  loadRideWeather();
});

document.getElementById("pauseRideBtn").addEventListener("click", () => {
  const button = document.getElementById("pauseRideBtn");

  if (!ridePaused) {
    ridePaused = true;
    ridePausedAt = Date.now();
    stopGpsTracking();
    rideLastPosition = null;

    button.textContent = "▶ Reprendre la balade";
    button.classList.add("is-paused");
    document.getElementById("rideTimerLabel").textContent = "Balade en pause";
  } else {
    rideTotalPausedMs += Date.now() - ridePausedAt;
    ridePausedAt = null;
    ridePaused = false;
    rideLastPosition = null;

    button.textContent = "⏸ Faire une pause";
    button.classList.remove("is-paused");
    document.getElementById("rideTimerLabel").textContent = "Temps de conduite";

    startGpsTracking();
  }

  updateRideTimer();
});

document.getElementById("finishRideBtn").addEventListener("click", () => {
  clearInterval(rideTimerInterval);
  stopGpsTracking();

  rideFinishedDuration = formatRideDuration(getRideSeconds());

  const distanceInput = document.querySelector('#rideForm [name="distance"]');
  const durationInput = document.querySelector('#rideForm [name="duration"]');
  const weatherInput = document.querySelector('#rideForm [name="weather"]');
  const dateInput = document.querySelector('#rideForm [name="date"]');

  distanceInput.value = rideDistanceKm.toFixed(1);
  durationInput.value = rideFinishedDuration;
  weatherInput.value = rideWeather;
  dateInput.value = new Date().toISOString().slice(0, 10);

  const overlay = document.getElementById("gratitudeOverlay");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");

    document.querySelectorAll("[data-check]").forEach(c => c.checked = false);
    updateChecklist();

    goTo("newRide");
  }, 4200);
});
document.getElementById("finishRideBtn").addEventListener("click",()=>{
  clearInterval(rideTimerInterval);
  const overlay=document.getElementById("gratitudeOverlay");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  setTimeout(()=>{
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden","true");
    document.querySelectorAll("[data-check]").forEach(c=>c.checked=false);
    updateChecklist();
    goTo("newRide");
  },4200);
});
document.getElementById("rideForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.rides.unshift(Object.fromEntries(new FormData(e.target).entries()));
  save();
  e.target.reset();
  document.querySelector('#rideForm [name="date"]').value=new Date().toISOString().slice(0,10);
  goTo("journal");
});
document.getElementById("routeForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.routes.unshift(Object.fromEntries(new FormData(e.target).entries()));
  save();
  e.target.reset();
  renderRoutes();
});
document.getElementById("maintenanceForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.maintenance={
    mileage:Number(document.getElementById("mileageInput").value)||0,
    next:Number(document.getElementById("maintenanceInput").value)||0,
    fuel:Number(document.getElementById("fuelInput").value)||0,
    notes:document.getElementById("maintenanceNotes").value
  };
  save();
  renderMaintenance();
});
document.getElementById("settingsForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.settings={
    temp:document.getElementById("settingTemp").value||"24°C",
    weather:document.getElementById("settingWeather").value||"Ensoleillé"
  };
  save();
  renderSettings();
  goTo("home");
});
function renderRides(){
  const list=document.getElementById("rideList");
  list.innerHTML="";
  if(!state.rides.length) list.innerHTML="<article class='list-card'>Ta prochaine aventure apparaîtra ici. 💙</article>";
  state.rides.forEach((ride,index)=>{
    const card=document.createElement("article");
    card.className="list-card";
    card.innerHTML=`<div class="list-card-top"><h3>${ride.name}</h3><button class="delete" data-delete-ride="${index}">Supprimer</button></div>
      <p>${formatDate(ride.date)} · ${Number(ride.distance)||0} km${ride.duration?` · ${ride.duration}`:""}</p>
      ${ride.weather?`<p>${ride.weather}</p>`:""}
      <p>Plaisir ${ride.fun}/10 · Confiance ${ride.confidence}/10</p>
      ${ride.favorite?`<p>Moment préféré : ${ride.favorite}</p>`:""}
      ${ride.notes?`<p>${ride.notes}</p>`:""}`;
    list.appendChild(card);
  });
  const total=state.rides.reduce((sum,r)=>sum+(Number(r.distance)||0),0);
  const longest=Math.max(0,...state.rides.map(r=>Number(r.distance)||0));
  const avg=state.rides.length?state.rides.reduce((sum,r)=>sum+(Number(r.confidence)||0),0)/state.rides.length:0;
  document.getElementById("journalCount").textContent=state.rides.length;
  document.getElementById("seasonRides").textContent=state.rides.length;
  document.getElementById("statsRides").textContent=state.rides.length;
  document.getElementById("journalKm").textContent=`${total} km`;
  document.getElementById("seasonKm").textContent=total;
  document.getElementById("statsKm").textContent=total;
  document.getElementById("longestRide").textContent=`${longest} km`;
  document.getElementById("statsLongest").textContent=`${longest} km`;
  document.getElementById("journalConfidence").textContent=state.rides.length?`${avg.toFixed(1)}/10`:"—";
  document.getElementById("statsConfidence").textContent=state.rides.length?`${avg.toFixed(1)}/10`:"—";
  if(state.rides.length){
    const r=state.rides[0];
    document.getElementById("lastRideDate").textContent=formatDate(r.date);
    document.getElementById("lastRideInfo").textContent=`${Number(r.distance)||0} km${r.duration?` · ${r.duration}`:""}${r.weather?` · ${r.weather}`:""}`;
    document.getElementById("lastRideName").textContent=r.name;
  }else{
    document.getElementById("lastRideDate").textContent="Aucune";
    document.getElementById("lastRideInfo").textContent="Ajoute ta première sortie";
    document.getElementById("lastRideName").textContent="—";
  }
}
function renderRoutes(){
  const list=document.getElementById("routeList");
  list.innerHTML="";
  if(!state.routes.length) list.innerHTML="<article class='list-card'>Ajoute ici les routes que tu aimerais refaire.</article>";
  state.routes.forEach((route,index)=>{
    const card=document.createElement("article");
    card.className="list-card";
    card.innerHTML=`<div class="list-card-top"><h3>${route.name}</h3><button class="delete" data-delete-route="${index}">Supprimer</button></div><p>${Number(route.distance)||0} km · ${route.difficulty}</p>`;
    list.appendChild(card);
  });
  document.getElementById("routeCount").textContent=state.routes.length;
}
function renderMaintenance(){
  const m=state.maintenance;
  document.getElementById("mileageInput").value=m.mileage||"";
  document.getElementById("maintenanceInput").value=m.next||"";
  document.getElementById("fuelInput").value=m.fuel??78;
  document.getElementById("maintenanceNotes").value=m.notes||"";
  document.getElementById("vehicleKm").textContent=`${m.mileage||0} km`;
  document.getElementById("fuelValue").textContent=`${m.fuel??78}%`;
  document.getElementById("fuelMessage").textContent=m.fuel>=60?"Bien partie !":m.fuel>=30?"À surveiller":"Pense à faire le plein";
  const status=document.getElementById("maintenanceStatus");
  if(!m.next){
    status.innerHTML="<strong>Prochain entretien à définir</strong><p>Ajoute le kilométrage prévu.</p>";
    document.getElementById("maintenanceDue").textContent="À définir";
    document.getElementById("maintenanceSub").textContent="Ajoute ton prochain kilométrage";
  }else{
    const remaining=m.next-m.mileage;
    if(remaining>0){
      status.innerHTML=`<strong>Entretien à ${m.next} km</strong><p>Il reste environ ${remaining} km.</p>`;
      document.getElementById("maintenanceDue").textContent=`Dans ${remaining} km`;
      document.getElementById("maintenanceSub").textContent=`À ${m.next} km`;
    }else{
      status.innerHTML="<strong>Entretien à prévoir</strong><p>Le kilométrage prévu est atteint.</p>";
      document.getElementById("maintenanceDue").textContent="Maintenant";
      document.getElementById("maintenanceSub").textContent="Le kilométrage est atteint";
    }
  }
}
function renderChallenges(){
  const box=document.getElementById("challengeList");
  box.innerHTML="";
  challengeDefaults.forEach((challenge,index)=>{
    const checked=Boolean(state.challenges[index]);
    const row=document.createElement("label");
    row.className="challenge-row";
    row.innerHTML=`<input type="checkbox" data-challenge="${index}" ${checked?"checked":""}><span>${checked?"★":"☆"} ${challenge}</span>`;
    box.appendChild(row);
  });
  box.querySelectorAll("input").forEach(input=>input.addEventListener("change",e=>{
    state.challenges[e.target.dataset.challenge]=e.target.checked;
    save();
    renderChallenges();
  }));
}
function renderSettings(){
  document.getElementById("weatherTemp").textContent=state.settings.temp;
  document.getElementById("weatherText").textContent=state.settings.weather;
  document.getElementById("settingTemp").value=state.settings.temp;
  document.getElementById("settingWeather").value=state.settings.weather;
}
document.addEventListener("click",e=>{
  const ride=e.target.closest("[data-delete-ride]");
  if(ride&&confirm("Supprimer cette sortie ?")){
    state.rides.splice(Number(ride.dataset.deleteRide),1);
    save();
    renderRides();
  }
  const route=e.target.closest("[data-delete-route]");
  if(route&&confirm("Supprimer ce parcours ?")){
    state.routes.splice(Number(route.dataset.deleteRoute),1);
    save();
    renderRoutes();
  }
});
function renderAll(){
  document.getElementById("greeting").textContent=getGreeting();
  document.getElementById("today").textContent=new Date().toLocaleDateString("fr-CA",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  document.getElementById("seasonYear").textContent=new Date().getFullYear();
  renderRides();
  renderRoutes();
  renderMaintenance();
  renderChallenges();
  renderSettings();
}
document.querySelector('#rideForm [name="date"]').value=new Date().toISOString().slice(0,10);
renderChecklist();
renderAll();
