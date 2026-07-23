const checklistDefaults=['Permis de conduire','Carte d’assurance','Téléphone chargé','Sena connecté','CarPlay connecté','Casque','Gants','Manteau','Bottes','Lunettes','Essence','Pression des pneus','Aucun voyant allumé','Coffres fermés','Eau ou collation'];
const challengeDefaults=['Première sortie seule','Premier plein','Premier 100 km','Premier pont','Première autoroute','Première ride de groupe','Ride de Filles','5 000 km','10 000 km'];

const state = {
  rides: JSON.parse(localStorage.getItem('spyderRides') || '[]'),
  routes: JSON.parse(localStorage.getItem('spyderRoutes') || '[]'),
  maintenance: JSON.parse(localStorage.getItem('spyderMaintenance') || '{"mileage":0,"oil":0,"notes":""}'),
  challenges: JSON.parse(localStorage.getItem('spyderChallenges') || '{}')
};

function save(){
  localStorage.setItem('spyderRides',JSON.stringify(state.rides));
  localStorage.setItem('spyderRoutes',JSON.stringify(state.routes));
  localStorage.setItem('spyderMaintenance',JSON.stringify(state.maintenance));
  localStorage.setItem('spyderChallenges',JSON.stringify(state.challenges));
}
function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  window.scrollTo({top:0,behavior:'smooth'});
  renderAll();
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-go]');if(btn)goTo(btn.dataset.go)});

function renderChecklist(){
  const box=document.getElementById('checklistItems'); box.innerHTML='';
  checklistDefaults.forEach((item,i)=>{
    const row=document.createElement('label'); row.className='check-row';
    row.innerHTML=`<input type="checkbox" data-check="${i}"><span>${item}</span>`;
    box.appendChild(row);
  });
  box.querySelectorAll('input').forEach(i=>i.addEventListener('change',updateReady));
  updateReady();
}
function updateReady(){
  const checks=[...document.querySelectorAll('[data-check]')];
  document.getElementById('readyButton').disabled=!checks.every(c=>c.checked);
}
document.getElementById('readyButton').addEventListener('click',()=>goTo('success'));
document.getElementById('resetChecklist').addEventListener('click',()=>{document.querySelectorAll('[data-check]').forEach(c=>c.checked=false);updateReady();});

document.getElementById('newRideButton').addEventListener('click',()=>{
  const dateInput=document.querySelector('#rideForm [name=date]');
  dateInput.value=new Date().toISOString().slice(0,10);
  goTo('newRide');
});
document.getElementById('rideForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.target);
  state.rides.unshift(Object.fromEntries(f.entries()));
  save(); e.target.reset(); goTo('journal');
});
function renderRides(){
  const list=document.getElementById('rideList'); list.innerHTML='';
  state.rides.forEach((r,i)=>{
    const el=document.createElement('article'); el.className='list-card';
    el.innerHTML=`<div class="row"><h3>🏍️ ${r.name}</h3><button class="delete-btn" data-delete-ride="${i}">Supprimer</button></div>
      <p>${r.date || ''} · ${r.distance || 0} km · ${r.duration || ''}</p>
      <p>😊 Plaisir ${r.fun}/10 · 💪 Confiance ${r.confidence}/10</p>
      ${r.favorite?`<p>❤️ ${r.favorite}</p>`:''}${r.notes?`<p>${r.notes}</p>`:''}`;
    list.appendChild(el);
  });
  document.getElementById('rideCount').textContent=state.rides.length;
  const total=state.rides.reduce((s,r)=>s+(Number(r.distance)||0),0);
  document.getElementById('totalDistance').textContent=`${total} km`;
  const avg=state.rides.length?state.rides.reduce((s,r)=>s+(Number(r.confidence)||0),0)/state.rides.length:0;
  document.getElementById('homeConfidence').textContent=state.rides.length?`${avg.toFixed(1)} / 10`:'— / 10';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-delete-ride]');
  if(b && confirm('Supprimer cette sortie?')){state.rides.splice(Number(b.dataset.deleteRide),1);save();renderRides();}
});

document.getElementById('maintenanceForm').addEventListener('submit',e=>{
  e.preventDefault();
  state.maintenance={mileage:Number(mileageInput.value)||0,oil:Number(oilInput.value)||0,notes:maintenanceNotes.value};
  save(); renderMaintenance();
});
function renderMaintenance(){
  mileageInput.value=state.maintenance.mileage||'';
  oilInput.value=state.maintenance.oil||'';
  maintenanceNotes.value=state.maintenance.notes||'';
  document.getElementById('homeMileage').textContent=`${state.maintenance.mileage||0} km`;
  const remaining=(state.maintenance.oil||0)-(state.maintenance.mileage||0);
  oilStatus.innerHTML=state.maintenance.oil?`<strong>Prochain changement d’huile</strong><p>${remaining>0?`${remaining} km restants`:'Entretien à prévoir maintenant'}</p>`:'<strong>Ajoute ton prochain kilométrage d’entretien.</strong>';
}

document.getElementById('routeForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.target); state.routes.unshift(Object.fromEntries(f.entries())); save(); e.target.reset(); renderRoutes();
});
function renderRoutes(){
  routeList.innerHTML='';
  state.routes.forEach((r,i)=>{
    const el=document.createElement('article');el.className='list-card';
    el.innerHTML=`<div class="row"><h3>🗺️ ${r.name}</h3><button class="delete-btn" data-delete-route="${i}">Supprimer</button></div><p>${r.distance||0} km · ${r.difficulty}</p>`;
    routeList.appendChild(el);
  });
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-delete-route]');
  if(b && confirm('Supprimer ce parcours?')){state.routes.splice(Number(b.dataset.deleteRoute),1);save();renderRoutes();}
});

function renderChallenges(){
  challengeList.innerHTML='';
  challengeDefaults.forEach((c,i)=>{
    const row=document.createElement('label');row.className='challenge';
    row.innerHTML=`<input type="checkbox" data-challenge="${i}" ${state.challenges[i]?'checked':''}><span>${state.challenges[i]?'🏅':'○'} ${c}</span>`;
    challengeList.appendChild(row);
  });
  challengeList.querySelectorAll('input').forEach(input=>input.addEventListener('change',e=>{state.challenges[e.target.dataset.challenge]=e.target.checked;save();renderChallenges();}));
}
function renderAll(){renderRides();renderMaintenance();renderRoutes();renderChallenges();}
renderChecklist();renderAll();
