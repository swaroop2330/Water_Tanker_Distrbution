let villageData = [];
let map, markerLayer;
const $ = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString("en-IN");
const shortage = v => Math.max(0, Number(v.required)-Number(v.available));
function priority(v){return Number(v.severity)*.6+Math.min(Number(v.population)/1000,10)*.4+(shortage(v)/Math.max(Number(v.required),1)*20);}
function initMap(){
  if(!window.L){$("map").innerHTML="Map library could not load. Check your internet connection.";return;}
  map=L.map("map").setView([15.0,78.3],7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
  markerLayer=L.layerGroup().addTo(map);
}
function approximatePoint(v,i){
  const districtCenters={"Nandyal":[15.48,78.48],"Annamayya":[14.05,78.75],"YSR Kadapa":[14.47,78.82]};
  const c=districtCenters[v.district]||[15,78.3];
  return [c[0]+((i%5)-2)*.035,c[1]+(Math.floor(i/5)-1)*.04];
}
function renderMap(rows){
  if(!map)return; markerLayer.clearLayers();
  rows.forEach((v,i)=>{
    const p=(Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))&&v.latitude!==null&&v.longitude!==null)?[Number(v.latitude),Number(v.longitude)]:approximatePoint(v,i);
    const color=Number(v.severity)>=50?"#ff7777":"#55d7d0";
    L.circleMarker(p,{radius:8,color,fillColor:color,fillOpacity:.85,weight:2}).bindPopup(`<b>${escapeHtml(v.name)}</b><br>${escapeHtml(v.district)}<br>Shortage: ${fmt(shortage(v))} L<br>Severity: ${v.severity}/100`).addTo(markerLayer);
  });
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(rows){
  villageData=rows;
  $("villageCount").textContent=fmt(rows.length);
  $("population").textContent=fmt(rows.reduce((a,v)=>a+Number(v.population||0),0));
  $("shortage").textContent=fmt(rows.reduce((a,v)=>a+shortage(v),0))+" L";
  $("criticalCount").textContent=rows.filter(v=>Number(v.severity)>=50).length;
  const sorted=[...rows].sort((a,b)=>priority(b)-priority(a));
  $("villageRows").innerHTML=sorted.map(v=>`<tr><td><b>${escapeHtml(v.name)}</b></td><td>${escapeHtml(v.district)}</td><td>${fmt(shortage(v))} L</td><td><span class="severity ${v.severity>=50?"high":""}">${v.severity}/100</span></td><td>${priority(v).toFixed(1)}</td></tr>`).join("");
  renderMap(rows);
}
async function loadVillages(){
  const district=$("districtFilter").value;
  try{const r=await fetch("/api/villages?district="+encodeURIComponent(district));if(!r.ok)throw Error("API error");render(await r.json());$("serverStatus").textContent="SYSTEM ONLINE";}
  catch(e){$("serverStatus").textContent="SERVER CONNECTION ERROR";console.error(e);}
}
async function runDispatch(){
  const btn=$("runBtn");btn.disabled=true;btn.textContent="Scheduling...";
  try{
    const r=await fetch("/api/schedule/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tankers:$("tankers").value,capacity:$("capacity").value})});
    const data=await r.json();if(!r.ok)throw Error(data.error||"Could not schedule");
    $("tripCount").textContent=data.trips.length+" trips";
    $("dispatchList").innerHTML=data.trips.length?data.trips.map(t=>`<div class="trip"><div><b>${escapeHtml(t.village)}</b><small>${escapeHtml(t.district)} · ${t.distance_km} km · ETA ${t.eta_minutes} min</small></div><b>${fmt(t.liters)} L</b></div>`).join(""):`<div class="empty">No deliveries required with current data.</div>`;
  }catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent="▶ Run Dispatch";}
}
$("runBtn").addEventListener("click",runDispatch);
$("refreshBtn").addEventListener("click",loadVillages);
$("districtFilter").addEventListener("change",loadVillages);
$("exportBtn").addEventListener("click",()=>window.location.href="/api/export");
$("addForm").addEventListener("submit",async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
  try{const r=await fetch("/api/villages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);e.target.reset();await loadVillages();alert("Village added successfully.");}catch(err){alert(err.message);}
});
$("excelFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=await file.arrayBuffer(), wb=XLSX.read(data), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const r=await fetch("/api/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows})});
    const out=await r.json();if(!r.ok)throw Error(out.error);await loadVillages();alert(`${out.count} village records imported.`);
  }catch(err){alert("Excel import failed: "+err.message);}finally{e.target.value="";}
});
$("today").textContent=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
initMap();loadVillages();
