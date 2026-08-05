const number = (value, digits = 0) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const date = value => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  if (!response.ok) throw new Error(`Dashboard request failed: ${response.status}`);
  const { athlete, state, rides, missions } = await response.json();

  const name = athlete?.firstname || 'Hutchy';
  document.querySelector('#rider-name').textContent = state.verified ? `${name} ✓` : name;
  document.querySelector('#rider-title').textContent = state.title;
  document.querySelector('#level').textContent = state.level;
  document.querySelector('#xp').textContent = number(state.xp);
  document.querySelector('#streak').textContent = `${number(state.streak)} days 🔥`;
  document.querySelector('#miles').textContent = number(state.lifetime_miles, 1);
  document.querySelector('#climbing').textContent = `${number(state.lifetime_climbing_ft)} ft`;
  document.querySelector('#rider-name').dataset.glow = state.glow;

  const missionRoot = document.querySelector('#missions');
  missionRoot.innerHTML = missions.length ? missions.map(mission => `
    <article class="mission-card">
      <p class="eyebrow">${escapeHtml(mission.mission_type)}</p>
      <strong>${escapeHtml(mission.name)}</strong>
      <p>${number(mission.distance_miles, 1)} mi · ${number(mission.climbing_ft)} ft · ${number(mission.estimated_minutes)} min</p>
      <p>Loop overlap: ${number(mission.overlap_percent, 1)}%</p>
    </article>
  `).join('') : '<article class="empty-state">Daily missions will appear here once route generation is connected.</article>';

  const ridesRoot = document.querySelector('#rides');
  ridesRoot.innerHTML = rides.length ? rides.map(ride => `
    <article class="ride-row">
      <div><span>Ride</span><strong>${escapeHtml(ride.name)}</strong><span>${date(ride.started_at)}</span></div>
      <div><span>Distance</span><strong>${number(ride.distance_miles, 1)} mi</strong></div>
      <div><span>Average</span><strong>${number(ride.average_speed_mph, 1)} mph</strong></div>
      <div><span>Power</span><strong>${ride.average_power ? `${number(ride.average_power)} W` : '—'}</strong></div>
      <div><span>Honours</span><strong>${number(ride.kom_count)} KOM · ${number(ride.top10_count)} Top 10</strong></div>
    </article>
  `).join('') : '<article class="empty-state">No rides imported yet.</article>';
}

loadDashboard().catch(error => {
  console.error(error);
  document.querySelector('#rides').innerHTML = `<article class="empty-state">${escapeHtml(error.message)}</article>`;
});
