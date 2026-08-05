const $ = selector => document.querySelector(selector);
const fmt = (number, decimals = 0) => Number(number || 0).toLocaleString(undefined, { maximumFractionDigits: decimals });
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const dateFmt = value => value ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Date unavailable";
const timeFmt = minutes => `${Math.floor(Number(minutes || 0) / 60)}h ${Math.round(Number(minutes || 0) % 60)}m`;
async function req(url, options = {}) { const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options }); const json = await response.json().catch(() => ({})); if (!response.ok) throw Error(json.error || `Request failed ${response.status}`); return json; }
function toast(text) { $("#toast").textContent = text; $("#toast").classList.remove("hidden"); setTimeout(() => $("#toast").classList.add("hidden"), 4200); }
function tier(t) { return { club: "#f5f8f3", warrior: "#74d4ff", breakaway: "#6ec8ff", kom: "#ffd65a", endurance: "#c99cff", elite: "#ff91c6", legend: "#ffda65", marshal: "#ff9f43", mythic: "#ffffff" }[t] || "#fff"; }
function decodePolyline(encoded) { if (!encoded) return []; let index=0,lat=0,lng=0,coordinates=[]; while(index<encoded.length){let shift=0,result=0,byte;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5;}while(byte>=0x20);lat+=(result&1)?~(result>>1):(result>>1);shift=0;result=0;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5;}while(byte>=0x20);lng+=(result&1)?~(result>>1):(result>>1);coordinates.push([lat/1e5,lng/1e5]);}return coordinates; }

function baseMap(element, zoomControl = false) {
  const map = L.map(element, { zoomControl, attributionControl: false, scrollWheelZoom: false, dragging: true, preferCanvas: true });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 20, subdomains: "abcd" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", { maxZoom: 20, subdomains: "abcd", pane: "overlayPane" }).addTo(map);
  return map;
}
function routeLayers(map, points, options = {}) {
  const outline = L.polyline(points, { color: "#071019", weight: (options.weight || 6) + 5, opacity: .95, lineCap: "round", lineJoin: "round" }).addTo(map);
  const line = L.polyline(points, { color: options.color || "#153d84", weight: options.weight || 6, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(map);
  if (window.L.polylineDecorator) L.polylineDecorator(line, { patterns: [{ offset: "6%", repeat: "10%", symbol: L.Symbol.arrowHead({ pixelSize: 8, polygon: false, pathOptions: { color: options.arrowColor || "#3b99ff", weight: 2.8, opacity: 1 } }) }] }).addTo(map);
  map.fitBounds(line.getBounds(), { padding: options.padding || [12, 12], maxZoom: options.maxZoom || 15 });
  return { outline, line };
}
function markerIcon(kind, label) { return L.divIcon({ className: `map-marker ${kind}`, html: `<span>${label}</span>`, iconSize: [34,34], iconAnchor:[17,17] }); }
function nearestPointIndex(points, target) { let best=0,score=Infinity; points.forEach((p,i)=>{const d=(p[0]-target[0])**2+(p[1]-target[1])**2;if(d<score){score=d;best=i;}}); return best; }
function addTargetsLayer(map, points, climbs) {
  const group = L.layerGroup();
  for (const climb of climbs || []) {
    const target=[climb.lat,climb.lng];
    const index=nearestPointIndex(points,target);
    const section=points.slice(Math.max(0,index-8),Math.min(points.length,index+9));
    const colour=climb.tailwindScore>=80?"#55e28b":"#f1bd58";
    if(section.length>1){ L.polyline(section,{color:"#07100b",weight:11,opacity:.9,lineCap:"round"}).addTo(group); L.polyline(section,{color,weight:7,opacity:1,lineCap:"round"}).addTo(group); }
    L.marker(target,{icon:markerIcon(climb.tailwindScore>=80?"target-hot":"target-warm","↗")}).addTo(group).bindPopup(`<strong>${esc(climb.name)}</strong><br>${fmt(climb.lengthMiles,1)} mi · ${fmt(climb.grade,1)}%<br><b>${climb.tailwindScore}% wind assistance</b>`);
  }
  group.addTo(map);
  return group;
}

const missionNames = { short: "The Yarm Flyer", long: "Teesdale Grinder", boss: "Buttertubs Beast" };
async function missionGpxFile(type) {
  const response = await fetch(`/api/missions/${type}/gpx`);
  if (!response.ok) { const data = await response.json().catch(()=>({})); throw new Error(data.error || "GPX generation failed."); }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || `${type}-road-league.gpx`;
  return new File([blob], filename, { type: "application/gpx+xml" });
}
function downloadFile(file) { const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1500); }
async function sendMission(type) {
  const button = document.querySelector(`[data-send-route="${type}"]`); const original = button?.textContent;
  try { if (button) { button.disabled = true; button.textContent = "Preparing GPX…"; } const file = await missionGpxFile(type); const shareData = { title: missionNames[type] || "Road League mission", text: "Road League mission — open the GPX in Wahoo.", files: [file] }; if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share(shareData); toast("Route shared. Choose Wahoo from the share sheet."); } else { downloadFile(file); toast("GPX downloaded. Open it with the Wahoo app."); } }
  catch (error) { if (error.name !== "AbortError") toast(error.message); }
  finally { if (button) { button.disabled = false; button.textContent = original; } }
}
async function downloadMission(type) { try { const file = await missionGpxFile(type); downloadFile(file); toast("GPX downloaded."); } catch (error) { toast(error.message); } }

const missionMaps = new Map();
async function initMissionMaps() {
  const data = await req("/api/missions/today");
  for (const mission of data.missions) {
    const id = mission.missionType === "short" ? "missionMapShort" : mission.missionType === "long" ? "missionMapLong" : "missionMapBoss";
    const map = baseMap(id); const button = document.querySelector(`[data-target-toggle="${mission.missionType}"]`);
    if (!mission.geojson?.features?.length) { map.setView([54.52,-1.32],10); L.marker([54.52,-1.32],{icon:markerIcon("route-wait","!")}).addTo(map).bindPopup("Exact route geometry unavailable. Try refreshing."); button.disabled = true; continue; }
    const feature = mission.geojson.features.find(f => f.geometry?.type === "LineString") || mission.geojson.features[0];
    const points = feature.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
    routeLayers(map, points, { weight: 6, padding:[12,12], maxZoom:15 });
    L.marker(points[0],{icon:markerIcon("start","●")}).addTo(map).bindPopup("Start");
    L.marker(points[points.length-1],{icon:markerIcon("finish","⚑")}).addTo(map).bindPopup("Finish");
    const quality=mission.loopQuality||{};
    const flowing=Boolean(quality.flowing && Number(quality.uTurns||0)===0 && Number(quality.overlapPercent||100)<=2);
    const label=flowing?"Excellent":"Rejected"; const flowText=flowing?"Smooth & flowing":"Regenerate required";
    document.querySelectorAll(`[data-quality-label="${mission.missionType}"]`).forEach(el=>el.textContent=label);
    document.querySelectorAll(`[data-quality-flow="${mission.missionType}"],[data-quality-flow-side="${mission.missionType}"]`).forEach(el=>el.textContent=flowText);
    document.querySelectorAll(`[data-quality-overlap="${mission.missionType}"]`).forEach(el=>el.textContent=`${quality.overlapPercent??"—"}%`);
    document.querySelectorAll(`[data-quality-overlap-top="${mission.missionType}"]`).forEach(el=>el.textContent=`${quality.overlapPercent??"—"}% ${flowing?"(within target)":"(too high)"}`);
    document.querySelectorAll(`[data-quality-uturns="${mission.missionType}"]`).forEach(el=>el.textContent=String(quality.uTurns??"—"));
    document.querySelectorAll(`[data-quality-uturn-top="${mission.missionType}"]`).forEach(el=>el.textContent=Number(quality.uTurns||0)===0?"No up & back":`${quality.uTurns} U-turn${quality.uTurns===1?"":"s"} detected`);
    let targets = null;
    button.addEventListener("click", event => {
      event.stopPropagation();
      if (targets) { map.removeLayer(targets); targets=null; button.classList.remove("active"); button.setAttribute("aria-pressed","false"); button.querySelector('b').textContent='Targets'; }
      else if(!(mission.climbs||[]).length){ toast('No tailwind-assisted Strava climbs intersect this mission today.'); }
      else { targets=addTargetsLayer(map,points,mission.climbs); button.classList.add("active"); button.setAttribute("aria-pressed","true"); button.querySelector('b').textContent=`${mission.climbs.length} Targets`; const bounds=targets.getBounds?.(); if(bounds?.isValid()) map.fitBounds(bounds,{padding:[45,45],maxZoom:14}); toast(`${mission.climbs.length} tailwind climb target${mission.climbs.length===1?'':'s'} revealed.`); }
    });
    missionMaps.set(mission.missionType,{map,points}); setTimeout(()=>map.invalidateSize(),80);
  }
}

async function load() {
  const data = await req("/api/state"); const state=data.state;
  $("#name").textContent=data.athlete.firstname||"Hutchy"; $("#name").style.color=tier(state.tier); $("#name").className=state.glow?`name-glow glow-${state.glow}`:"";
  $("#title").textContent=state.title; $("#level").textContent=`Level ${state.level}`; $("#tick").classList.toggle("hidden",!state.verified); $("#streak").textContent=`${state.streak} DAY${state.streak===1?"":"S"}`;
  $("#xp").textContent=fmt(state.xp); $("#koms").textContent=fmt(data.totals.koms); $("#prs").textContent=fmt(data.totals.prs); $("#top10").textContent=fmt(data.totals.top10s); $("#top10Lifetime").textContent=fmt(data.totals.top10s); $("#uniqueSegments").textContent=fmt(data.totals.unique_segments);
  const lifetime=data.lifetime||{};
  $("#lifetimeMiles").textContent=lifetime.refreshed_at?`${fmt(lifetime.distance_miles,0)} mi`:'—'; $("#lifetimeRides").textContent=lifetime.refreshed_at?`${fmt(lifetime.ride_count)} lifetime rides`:'Press Refresh lifetime';
  $("#lifetimeElevation").textContent=lifetime.refreshed_at?`${fmt(lifetime.elevation_ft)} ft`:'—'; $("#lifetimeHours").textContent=lifetime.refreshed_at?`${fmt(lifetime.moving_hours)} moving hours`:'Official Strava totals';
  $("#biggestRide").textContent=lifetime.refreshed_at?`${fmt(lifetime.biggest_ride_miles,1)} mi`:'—'; $("#biggestClimb").textContent=lifetime.refreshed_at?`Biggest climb ${fmt(lifetime.biggest_climb_ft)} ft`:'Biggest climb —';
  $("#palmaresProgress").textContent=data.palmares?.complete?`${fmt(data.palmares.scanned_activities)} activities scanned · complete`:`${fmt(data.palmares?.scanned_activities||0)} activities scanned`;
  $("#xpFill").style.width=`${(state.xp%500)/5}%`; $("#next").textContent=`${500-(state.xp%500)} XP to level ${state.level+1}`;
  $("#rides").innerHTML=data.rides.map(ride=>`<article class="ride-card compact" data-id="${ride.id}"><div class="ride-card-body"><div class="ride-title-row"><div><span class="overline">${esc(ride.mission_type||"ride")} · ${dateFmt(ride.started_at)}</span><h3>${esc(ride.name)}</h3></div><span class="xp-badge">+${fmt(ride.xp_awarded)} XP</span></div><div class="ride-metrics"><span><small>DISTANCE</small><strong>${fmt(ride.distance_miles,1)} mi</strong></span><span><small>AVERAGE</small><strong>${fmt(ride.average_speed_mph,1)} mph</strong></span><span><small>POWER</small><strong>${ride.weighted_average_watts||ride.average_watts?fmt(ride.weighted_average_watts||ride.average_watts)+" W":"—"}</strong></span><span><small>CLIMB</small><strong>${fmt(ride.climbing_ft)} ft</strong></span></div><div class="ride-honours"><span>${ride.kom_count?`👑 ${ride.kom_count} KOM`:"No KOM"}</span><span>${ride.pr_count?`⚡ ${ride.pr_count} PR`:`${ride.segment_count||0} segments`}</span><span class="open-analysis">Open analysis →</span></div></div></article>`).join("")||"<p>No rides imported yet.</p>";
  document.querySelectorAll(".ride-card").forEach(card=>card.addEventListener("click",()=>openRide(card.dataset.id)));
}

async function openRide(id) {
  const data=await req(`/api/rides/${id}`),r=data.ride; const metric=(label,value)=>`<div class="analysis-metric"><small>${label}</small><strong>${value??"—"}</strong></div>`;
  const segmentHtml=data.segments.length?data.segments.map(segment=>`<div class="segment"><div><strong>${esc(segment.segment_name)}</strong><small>${fmt(segment.distance_miles,2)} mi · ${fmt(segment.average_grade,1)}%</small></div><div><small>TIME</small><strong>${Math.floor(segment.elapsed_seconds/60)}:${String(segment.elapsed_seconds%60).padStart(2,"0")}</strong></div><div><small>PR</small><strong>${segment.pr_rank?`#${segment.pr_rank}`:"—"}</strong></div><div><small>OVERALL</small><strong>${segment.kom_rank?`#${segment.kom_rank}`:"—"}</strong></div><div><small>HONOUR</small><strong>${segment.kom_rank===1?"👑 KOM":segment.pr_rank===1?"⚡ PR":"—"}</strong></div></div>`).join(""):`<p>No segment data yet. <button onclick="analyseRide(${r.id})" class="button secondary">Analyse this ride</button></p>`;
  $("#modalBody").innerHTML=`<span class="overline">RIDE ANALYSIS · ${dateFmt(r.started_at)}</span><h2>${esc(r.name)}</h2><p>${esc(data.verdict)}</p><div id="detailMap" class="detail-map"></div><div class="analysis-grid">${metric("DISTANCE",`${fmt(r.distance_miles,1)} mi`)}${metric("MOVING TIME",timeFmt(r.moving_minutes))}${metric("AVERAGE",`${fmt(r.average_speed_mph,1)} mph`)}${metric("MAX SPEED",r.max_speed_mph?`${fmt(r.max_speed_mph,1)} mph`:"—")}${metric("ELEVATION",`${fmt(r.climbing_ft)} ft`)}${metric("AVG POWER",r.average_watts?`${fmt(r.average_watts)} W`:"—")}${metric("WEIGHTED POWER",r.weighted_average_watts?`${fmt(r.weighted_average_watts)} W`:"—")}${metric("MAX POWER",r.max_watts?`${fmt(r.max_watts)} W`:"—")}${metric("AVG HR",r.average_heartrate?`${fmt(r.average_heartrate)} bpm`:"—")}${metric("MAX HR",r.max_heartrate?`${fmt(r.max_heartrate)} bpm`:"—")}${metric("CADENCE",r.average_cadence?`${fmt(r.average_cadence)} rpm`:"—")}${metric("ENERGY",r.kilojoules?`${fmt(r.kilojoules)} kJ`:r.calories?`${fmt(r.calories)} kcal`:"—")}</div><div class="honour-grid"><div class="honour"><strong>${r.kom_count}</strong><small>KOMs</small></div><div class="honour"><strong>${r.pr_count}</strong><small>PRs</small></div><div class="honour"><strong>${r.top10_count}</strong><small>Top 10s</small></div><div class="honour"><strong>${r.segment_count}</strong><small>Segments</small></div></div><h3>Segment efforts</h3>${segmentHtml}`;
  $("#modal").showModal(); setTimeout(()=>{const map=baseMap("detailMap",true),points=decodePolyline(r.map_polyline); if(points.length>1){routeLayers(map,points,{weight:7,padding:[8,8],maxZoom:16});L.marker(points[0],{icon:markerIcon("start","●")}).addTo(map);L.marker(points[points.length-1],{icon:markerIcon("finish","⚑")}).addTo(map);}else map.setView([r.start_lat||54.52,r.start_lng||-1.32],12);map.invalidateSize();},120);
}
window.analyseRide=async id=>{toast("Pulling full Strava analysis…");await req(`/api/rides/${id}/analyse`,{method:"POST",body:"{}"});await load();await openRide(id);toast("Ride analysis refreshed.");};
$("#closeModal").onclick=()=>$("#modal").close();
$("#sync").onclick=async()=>{toast("Syncing and enriching Strava rides…");const d=await req("/api/strava/sync",{method:"POST",body:"{}"});await load();toast(`${d.imported} new, ${d.refreshed} refreshed.`);};
$("#analyseAll").onclick=async()=>{toast("Refreshing maps, power and segments…");const d=await req("/api/strava/analyse-recent",{method:"POST",body:"{}"});await load();toast(`${d.analysed} rides fully analysed.`);};
document.querySelectorAll(".mission").forEach(mission=>mission.addEventListener("click",()=>{document.querySelectorAll(".mission").forEach(x=>x.classList.remove("selected"));mission.classList.add("selected");}));
$("#lifetimeRefresh").onclick=async()=>{toast('Refreshing official Strava lifetime totals…');await req('/api/strava/lifetime',{method:'POST',body:'{}'});await load();toast('Lifetime totals updated.');};
$("#buildPalmares").onclick=async()=>{const button=$("#buildPalmares");button.disabled=true;button.textContent='Scanning…';try{const d=await req('/api/palmares/scan',{method:'POST',body:JSON.stringify({batch:8})});await load();toast(d.complete?`Palmarès complete · ${d.scanned_activities} activities scanned`:`Scanned ${d.scanned_activities} activities. Press again to continue.`);}finally{button.disabled=false;button.textContent='Build Palmarès';}};
document.querySelectorAll("[data-send-route]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); sendMission(button.dataset.sendRoute); }));
document.querySelectorAll("[data-download-route]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); downloadMission(button.dataset.downloadRoute); }));
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt = event; $("#installApp")?.classList.remove("hidden"); });
$("#installApp")?.addEventListener("click", async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $("#installApp")?.classList.add("hidden"); });
Promise.all([initMissionMaps(),load()]).catch(error=>toast(error.message));
