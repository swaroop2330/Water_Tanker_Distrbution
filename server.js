const express = require("express");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, "data", "villages.json");
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const seed = [
  ["Nandyal","Mahanandi",1240,62000,18000,44,14.5],
  ["Nandyal","Gajulapalli",980,49000,12000,55,18.2],
  ["Nandyal","Brahmanakotkur",1560,78000,26000,38,21.0],
  ["Nandyal","Sirivella",2100,105000,30000,43,26.4],
  ["Nandyal","Allagadda Rural",1850,92500,18000,62,32.1],
  ["Nandyal","Koilkuntla",1420,71000,24000,35,28.0],
  ["Nandyal","Dhone Rural",2300,115000,35000,42,38.5],
  ["Nandyal","Banaganapalli Rural",1750,87500,22000,45,31.2],
  ["Nandyal","Panyam Rural",1320,66000,17000,48,19.8],
  ["Nandyal","Rudravaram",1180,59000,14000,47,24.6],
  ["Annamayya","Rayachoti Rural",2200,110000,28000,51,34.0],
  ["Annamayya","Lakkireddipalli",1600,80000,21000,42,29.4],
  ["Annamayya","Galiveedu",1450,72500,16000,48,36.2],
  ["Annamayya","Sambepalli",1280,64000,12000,55,31.7],
  ["Annamayya","Chinnamandem",1160,58000,15000,41,27.8],
  ["Annamayya","Veeraballi",1380,69000,18000,43,24.9],
  ["Annamayya","Nandalur Rural",1920,96000,25000,42,40.1],
  ["Annamayya","Rajampet Rural",2050,102500,30000,41,37.5],
  ["Annamayya","T Sundupalli",1120,56000,11000,52,33.3],
  ["Annamayya","Ramapuram",1240,62000,13000,48,30.2],
  ["YSR Kadapa","Chennur",1800,90000,26000,39,12.4],
  ["YSR Kadapa","Pendlimarri",1540,77000,16000,48,20.8],
  ["YSR Kadapa","Vempalli Rural",2100,105000,24000,50,35.1],
  ["YSR Kadapa","Kamalapuram Rural",1700,85000,20000,45,17.6],
  ["YSR Kadapa","Jammalamadugu Rural",2250,112500,28000,48,42.3],
  ["YSR Kadapa","Proddatur Rural",2450,122500,35000,43,30.5],
  ["YSR Kadapa","Mydukur Rural",1880,94000,19000,51,26.7],
  ["YSR Kadapa","Badvel Rural",1980,99000,22000,48,39.0],
  ["YSR Kadapa","Siddavatam",1320,66000,17000,39,23.5],
  ["YSR Kadapa","Kondapuram",1420,71000,14000,52,44.2]
].map((r,i)=>({
  id:i+1, district:r[0], name:r[1], population:r[2], required:r[3],
  available:r[4], severity:r[5], distance:r[6], tankerCount:Math.max(1,Math.ceil((r[3]-r[4])/10000)),
  latitude:null, longitude:null
}));

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seed,null,2));
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  } catch { return seed; }
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2)); }
let villages = readData();

let pool = null;
async function connectMySQL() {
  if (!process.env.DB_HOST) return;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST, user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "water_tanker_db",
      waitForConnections: true, connectionLimit: 5
    });
    await pool.query("SELECT 1");
    console.log("MySQL connected.");
  } catch (e) {
    pool = null;
    console.log("MySQL not connected; using local JSON storage.");
  }
}

function priority(v) {
  const shortage = Math.max(0, v.required - v.available);
  return (v.severity * 0.6) + (Math.min(v.population / 1000, 10) * 0.4) + (shortage / Math.max(v.required,1) * 20);
}
app.get("/api/health", (req,res)=>res.json({status:"ONLINE",database:pool?"MySQL":"Local JSON",project:"AQUAGUARD"}));
app.get("/api/villages", (req,res)=>{
  const district = req.query.district || "all";
  const rows = district === "all" ? villages : villages.filter(v=>v.district===district);
  res.json(rows.map(v=>({...v, shortage:Math.max(0,v.required-v.available), priority:Number(priority(v).toFixed(2))})));
});
app.post("/api/villages", (req,res)=>{
  const {district,name,population,required,available,severity,distance} = req.body;
  if (!district || !name || !Number(population) || !Number(required)) return res.status(400).json({error:"District, village name, population and water requirement are required."});
  const v = {id:Date.now(),district,name,population:Number(population),required:Number(required),available:Number(available||0),severity:Number(severity||50),distance:Number(distance||0),tankerCount:1,latitude:null,longitude:null};
  villages.push(v); saveData(villages); res.status(201).json(v);
});
app.put("/api/villages/:id", (req,res)=>{
  const id=Number(req.params.id), idx=villages.findIndex(v=>v.id===id);
  if(idx<0) return res.status(404).json({error:"Village not found"});
  villages[idx]={...villages[idx],...req.body,id};
  ["population","required","available","severity","distance"].forEach(k=>{if(req.body[k]!==undefined) villages[idx][k]=Number(req.body[k]);});
  saveData(villages); res.json(villages[idx]);
});
app.delete("/api/villages/:id",(req,res)=>{
  villages=villages.filter(v=>v.id!==Number(req.params.id)); saveData(villages); res.json({ok:true});
});
app.post("/api/schedule/run",(req,res)=>{
  const fleet=Number(req.body.tankers||12), capacity=Number(req.body.capacity||10000);
  let remaining=fleet, trips=[];
  const ordered=[...villages].sort((a,b)=>priority(b)-priority(a));
  for(const v of ordered){
    let deficit=Math.max(0,v.required-v.available);
    while(deficit>0 && remaining>0){
      const amount=Math.min(capacity,deficit);
      trips.push({village:v.name,district:v.district,liters:amount,priority:Number(priority(v).toFixed(2)),distance_km:v.distance,eta_minutes:Math.round(v.distance/40*60)});
      deficit-=amount; remaining--;
    }
  }
  res.json({trips,used:fleet-remaining,remaining,algorithm:"Greedy + Priority Queue",message:`Created ${trips.length} tanker deliveries.`});
});
app.get("/api/export",(req,res)=>{
  const ws=XLSX.utils.json_to_sheet(villages.map(v=>({
    "District Name":v.district,"Village Name":v.name,"Population":v.population,
    "Total Water Requirement (L)":v.required,"Available Water (L)":v.available,
    "Water Shortage (L)":Math.max(0,v.required-v.available),"Shortage Severity":v.severity,
    "Number of Tankers Required":v.tankerCount,"Distance (km)":v.distance
  })));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Village Data");
  const buf=XLSX.write(wb,{type:"buffer",bookType:"xlsx"});
  res.setHeader("Content-Disposition",'attachment; filename="aquaguard-villages.xlsx"');
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").send(buf);
});
app.post("/api/import",(req,res)=>{
  if(!req.body.rows || !Array.isArray(req.body.rows)) return res.status(400).json({error:"No spreadsheet rows received"});
  const mapped=req.body.rows.map((r,i)=>({
    id:Date.now()+i,district:String(r["District Name"]||r.district||"Unknown"),
    name:String(r["Village Name"]||r.name||`Village ${i+1}`),
    population:Number(r.Population||r.population||0),
    required:Number(r["Total Water Requirement (L)"]||r.required||0),
    available:Number(r["Available Water (L)"]||r.available||0),
    severity:Number(r["Shortage Severity"]||r.severity||50),
    distance:Number(r["Distance (km)"]||r.distance||0),tankerCount:1,latitude:null,longitude:null
  }));
  villages=mapped; saveData(villages); res.json({ok:true,count:villages.length});
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
connectMySQL().finally(()=>app.listen(PORT,()=>console.log(`AQUAGUARD running at http://localhost:${PORT}`)));
