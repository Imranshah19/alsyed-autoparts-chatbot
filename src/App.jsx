import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tholqekexlpgcbkaemft.supabase.co";
const SUPABASE_KEY = "sb_publishable_UQIulgzaOuBggjQYg6AlJA_-2_oN4zG";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORE_KEY = "alsyed_store_v2";

const DEFAULT_STORE = {
  name: "AlSyed Autoparts",
  owner: "Syed Imran Shah",
  whatsapp: "923332455770",
  whatsapp_display: "0333-2455770",
  location: "Karachi, Pakistan",
  timing: "Subah 9 baje se Raat 9 baje tak",
  juma: "Juma 2-4 baje band",
  delivery: "Karachi mein free delivery Rs.1500+ orders pe",
  warranty_original: "6 months",
  warranty_oem: "3 months",
};

const DEFAULT_PRODUCTS = [
  { category: "Toyota",      name: "Corolla Brake Pads",           original: 3200,  oem: 1800, stock: true },
  { category: "Toyota",      name: "Corolla Air Filter",            original: 800,   oem: 500,  stock: true },
  { category: "Toyota",      name: "Corolla Oil Filter",            original: 450,   oem: 280,  stock: true },
  { category: "Toyota",      name: "Corolla Timing Belt Kit",       original: 8500,  oem: 5500, stock: true },
  { category: "Toyota",      name: "Fortuner Brake Disc (pair)",    original: 12000, oem: 8500, stock: false },
  { category: "Honda",       name: "Civic Brake Pads 2016-2024",    original: 3500,  oem: 2000, stock: true },
  { category: "Honda",       name: "City Air Filter",               original: 700,   oem: 450,  stock: true },
  { category: "Honda",       name: "HR-V CVT Filter",               original: 4200,  oem: 0,    stock: true },
  { category: "Suzuki",      name: "Mehran/Alto Brake Shoes",       original: 900,   oem: 600,  stock: true },
  { category: "Suzuki",      name: "Cultus Clutch Plate",           original: 3800,  oem: 2500, stock: true },
  { category: "Suzuki",      name: "Every Van Timing Chain Kit",    original: 6500,  oem: 0,    stock: true },
  { category: "Kia/Hyundai", name: "Sportage Brake Pads",          original: 4500,  oem: 2800, stock: true },
  { category: "Mazda T3500", name: "T3500 Parts — WhatsApp karein", original: 0,     oem: 0,    stock: true },
  { category: "Motorcycle",  name: "Honda 125 Brake Shoes",         original: 350,   oem: 220,  stock: true },
  { category: "Motorcycle",  name: "Yamaha YBR Chain Sprocket Kit", original: 1800,  oem: 1200, stock: true },
  { category: "Engine Oil",  name: "Mobil 1 5W-30 (4L)",           original: 4200,  oem: 0,    stock: true },
  { category: "Engine Oil",  name: "Shell Helix HX7 (4L)",         original: 2800,  oem: 0,    stock: true },
  { category: "Engine Oil",  name: "Total Quartz 5W-40 (4L)",      original: 3100,  oem: 0,    stock: true },
];

const loadLS = (key, fallback) => {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
};
const saveLS = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

const buildPrompt = (products, store) => {
  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  let pText = "";
  Object.entries(grouped).forEach(([cat, items]) => {
    pText += `\n${cat}:\n`;
    items.forEach(p => {
      if (!p.original) { pText += `  • ${p.name}\n`; return; }
      const oem = p.oem > 0 ? ` | OEM: Rs.${p.oem.toLocaleString()}` : "";
      pText += `  • ${p.name}: Rs.${p.original.toLocaleString()}${oem}${p.stock ? "" : " [order pe milega]"}\n`;
    });
  });
  return `Tum "${store.name}" ke friendly AI sales assistant ho. Naam: Saim. Owner: ${store.owner}.

DUKAAN:
• WhatsApp: ${store.whatsapp_display} (${store.owner})
• Location: ${store.location}
• Timing: ${store.timing} (${store.juma})
• Delivery: ${store.delivery}
• Warranty: Original ${store.warranty_original} | OEM ${store.warranty_oem}

PRODUCTS:${pText}

STYLE:
• Roman Urdu mein baat karo
• "Ji", "Sir/Madam" use karo, friendly raho
• Price pe Original + OEM dono batao
• Mazda T3500: "Ji hamare paas hain! WhatsApp karein: ${store.whatsapp_display}"
• Order ke liye WhatsApp: ${store.whatsapp_display}
• Sirf auto parts topic pe raho, short jawab do`;
};

const CATS = ["Toyota","Honda","Suzuki","Suzuki 2 Stock","Kia/Hyundai","Mazda T3500","Mazda T4100","Shezore","Master","Chamber","Motorcycle","Engine Oil","Other"];

function Dots() {
  return (
    <div style={{display:"flex",gap:4,padding:"2px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#c1121f",
          animation:"td 1.2s infinite",animationDelay:`${i*0.2}s`}}/>
      ))}
    </div>
  );
}

function Admin({ products, setProducts, store, setStore, onClose }) {
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({category:"Mazda T3500",name:"",original:"",oem:"",stock:true});
  const [sf, setSf] = useState(store);
  const [saved, setSaved] = useState(false);
  const [dbMsg, setDbMsg] = useState("");

  const grouped = {};
  products.forEach(p=>{if(!grouped[p.category])grouped[p.category]=[];grouped[p.category].push(p);});

  const addP = async () => {
    if(!newP.name.trim()) return;
    setDbMsg("Saving...");
    const { data, error } = await supabase.from("products").insert([{
      category: newP.category, name: newP.name.trim(),
      original: Number(newP.original)||0, oem: Number(newP.oem)||0, stock: newP.stock
    }]).select();
    if (!error && data) {
      setProducts(prev => [...prev, data[0]]);
      setNewP({category:"Mazda T3500",name:"",original:"",oem:"",stock:true});
      setShowAdd(false);
      setDbMsg("✅ Saved!");
    } else { setDbMsg("❌ Error!"); }
    setTimeout(()=>setDbMsg(""), 2000);
  };

  const updP = async (id, f, v) => {
    setProducts(products.map(p=>p.id===id?{...p,[f]:v}:p));
    await supabase.from("products").update({[f]:v}).eq("id",id);
  };

  const delP = async (id) => {
    setProducts(products.filter(p=>p.id!==id));
    await supabase.from("products").delete().eq("id",id);
  };

  const saveStore = () => {
    setStore(sf); saveLS(STORE_KEY,sf);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const IS = {width:"100%",padding:"9px 11px",background:"#12121f",border:"1px solid #2a2a3e",
    borderRadius:8,color:"#f0f0f0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.93)",
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:480,background:"#0f0f18",borderRadius:"20px 20px 0 0",
        border:"1px solid #2a1a1a",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>

        <div style={{background:"linear-gradient(135deg,#c1121f,#8b0000)",padding:"14px 18px",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:15}}>⚙️ Admin Panel</div>
            <div style={{color:"rgba(255,255,255,0.7)",fontSize:11,marginTop:1}}>
              {dbMsg || `${products.filter(p=>p.stock).length} in stock • 🌐 Supabase Connected`}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
            color:"#fff",cursor:"pointer",padding:"7px 14px",fontWeight:800,fontSize:13,fontFamily:"inherit"}}>✕</button>
        </div>

        <div style={{display:"flex",background:"#0a0a12",borderBottom:"1px solid #1a1a2e"}}>
          {[["products","📦 Products"],["store","🏪 Store Info"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"11px",border:"none",cursor:"pointer",
              background:tab===k?"#1a1a2e":"transparent",color:tab===k?"#fff":"#555",
              fontWeight:tab===k?800:400,fontSize:13,fontFamily:"inherit",
              borderBottom:tab===k?"2px solid #c1121f":"2px solid transparent"}}>{l}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 16px 24px"}}>
          {tab==="products"&&(
            <>
              <div style={{background:"#0a1a0a",border:"1px solid #16a34a40",borderRadius:10,
                padding:"10px 14px",marginBottom:12,fontSize:12,color:"#16a34a"}}>
                🌐 <b>Supabase connected!</b> Products add karo — sab ke phone pe dikhega!
              </div>
              {!showAdd?(
                <button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"11px",background:"transparent",
                  border:"2px dashed #c1121f40",borderRadius:10,color:"#c1121f",cursor:"pointer",
                  fontWeight:800,fontSize:14,marginBottom:14,fontFamily:"inherit"}}>+ Naya Product Add Karein</button>
              ):(
                <div style={{background:"#1a0a0a",borderRadius:12,padding:14,border:"1px solid #c1121f40",marginBottom:14}}>
                  <div style={{color:"#c1121f",fontWeight:800,fontSize:12,letterSpacing:1,marginBottom:10}}>✨ NAYA PRODUCT</div>
                  <div style={{display:"grid",gap:8}}>
                    <select value={newP.category} onChange={e=>setNewP(p=>({...p,category:e.target.value}))} style={IS}>
                      {CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input placeholder="Part ka naam *" value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))} style={IS}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <input placeholder="Original Price" type="number" value={newP.original} onChange={e=>setNewP(p=>({...p,original:e.target.value}))} style={IS}/>
                      <input placeholder="OEM (0=N/A)" type="number" value={newP.oem} onChange={e=>setNewP(p=>({...p,oem:e.target.value}))} style={IS}/>
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:"#ccc",fontSize:13}}>
                      <input type="checkbox" checked={newP.stock} onChange={e=>setNewP(p=>({...p,stock:e.target.checked}))} style={{accentColor:"#c1121f"}}/>
                      Stock mein available hai
                    </label>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={addP} style={{flex:2,padding:"10px",background:"#c1121f",border:"none",
                        borderRadius:8,color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>✓ Add Karein</button>
                      <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"10px",background:"transparent",
                        border:"1px solid #333",borderRadius:8,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {Object.entries(grouped).map(([cat,items])=>(
                <div key={cat} style={{marginBottom:18}}>
                  <div style={{fontSize:10,fontWeight:800,color:cat==="Mazda T3500"?"#f4a261":"#c1121f",
                    letterSpacing:2,textTransform:"uppercase",marginBottom:8,
                    display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:1,background:"#1a1a2e"}}/>
                    {cat}
                    <div style={{flex:1,height:1,background:"#1a1a2e"}}/>
                  </div>
                  {items.map(p=>(
                    <div key={p.id} style={{background:"#1a1a2e",borderRadius:10,padding:"10px 12px",
                      marginBottom:6,border:`1px solid ${p.stock?"#2a2a3e":"#3a1010"}`,opacity:p.stock?1:0.6}}>
                      {editing===p.id?(
                        <div style={{display:"grid",gap:7}}>
                          <input value={p.name} onChange={e=>updP(p.id,"name",e.target.value)} style={IS}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                            <input type="number" value={p.original} onChange={e=>updP(p.id,"original",Number(e.target.value))} style={IS} placeholder="Original"/>
                            <input type="number" value={p.oem} onChange={e=>updP(p.id,"oem",Number(e.target.value))} style={IS} placeholder="OEM"/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",color:"#ccc",fontSize:12}}>
                              <input type="checkbox" checked={p.stock} onChange={e=>updP(p.id,"stock",e.target.checked)} style={{accentColor:"#c1121f"}}/>
                              Stock mein
                            </label>
                            <button onClick={()=>setEditing(null)} style={{background:"#c1121f",border:"none",
                              borderRadius:7,color:"#fff",padding:"6px 16px",cursor:"pointer",fontWeight:800,fontSize:12}}>✓ Save</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:"#f0f0f0",fontSize:13,fontWeight:600,
                              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {p.stock?"🟢":"🔴"} {p.name}
                            </div>
                            {p.original>0&&(
                              <div style={{color:"#666",fontSize:11,marginTop:2}}>
                                Rs.{p.original.toLocaleString()}
                                {p.oem>0&&<span> • OEM Rs.{p.oem.toLocaleString()}</span>}
                              </div>
                            )}
                          </div>
                          <button onClick={()=>setEditing(p.id)} style={{background:"transparent",border:"1px solid #2a2a3e",borderRadius:6,cursor:"pointer",padding:"5px 9px",fontSize:13}}>✏️</button>
                          <button onClick={()=>delP(p.id)} style={{background:"transparent",border:"1px solid #3a1a1a",borderRadius:6,cursor:"pointer",padding:"5px 9px",fontSize:13}}>🗑️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
          {tab==="store"&&(
            <div style={{display:"grid",gap:12}}>
              {[["Dukaan Naam","name"],["Owner","owner"],["WhatsApp","whatsapp"],
                ["Display Number","whatsapp_display"],["Location","location"],["Timing","timing"],
                ["Juma","juma"],["Delivery","delivery"],["Original Warranty","warranty_original"],["OEM Warranty","warranty_oem"],
              ].map(([label,key])=>(
                <div key={key}>
                  <label style={{fontSize:11,fontWeight:700,color:"#c1121f",display:"block",marginBottom:5}}>
                    {label.toUpperCase()}
                  </label>
                  <input value={sf[key]} onChange={e=>setSf(f=>({...f,[key]:e.target.value}))} style={IS}/>
                </div>
              ))}
              <button onClick={saveStore} style={{width:"100%",padding:"13px",marginTop:4,
                background:saved?"#16a34a":"linear-gradient(135deg,#c1121f,#8b0000)",
                border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:15,
                cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>
                {saved?"✓ Saved!":"💾 Save Karein"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [store, setStore]       = useState(()=>loadLS(STORE_KEY, DEFAULT_STORE));
  const [loaded, setLoaded]     = useState(false);
  const [messages, setMessages] = useState([{role:"assistant",
    text:"Assalamu Alaikum! 👋\nMain Saim hoon — AlSyed Autoparts ka AI Assistant.\n\nCar, Truck ya Bike ke parts ke baare mein poochein!\n\n🚗 Toyota • Honda • Suzuki\n🚛 Mazda T3500\n🏍️ Motorcycle • Engine Oils\n\n24/7 haazir hoon! 🕐"}]);
  const [input,setInput]         = useState("");
  const [loading,setLoading]     = useState(false);
  const [showAdmin,setShowAdmin] = useState(false);
  const [showQuick,setShowQuick] = useState(true);
  const [installPrompt,setInstallPrompt] = useState(null);
  const [isIOS] = useState(()=>/iPhone|iPad|iPod/.test(navigator.userAgent));
  const [iosGuide,setIosGuide]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(()=>{
    (async()=>{
      const { data, error } = await supabase.from("products").select("*").order("id");
      if(!error && data && data.length>0){
        setProducts(data);
      } else {
        const { data: ins } = await supabase.from("products").insert(DEFAULT_PRODUCTS).select();
        setProducts(ins || DEFAULT_PRODUCTS.map((p,i)=>({...p,id:i+1})));
      }
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    const h=e=>{e.preventDefault();setInstallPrompt(e);};
    window.addEventListener("beforeinstallprompt",h);
    return()=>window.removeEventListener("beforeinstallprompt",h);
  },[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);

  const openWA=(msg="")=>{
    const t=msg||"Assalamu Alaikum! AlSyed Autoparts se parts chahiye.";
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(t)}`,"_blank");
  };
  const install=async()=>{
    if(isIOS){setIosGuide(true);return;}
    if(!installPrompt)return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };
  const send=async(text)=>{
    const ut=text||input.trim();
    if(!ut||loading)return;
    setInput("");setShowQuick(false);
    const updated=[...messages,{role:"user",text:ut}];
    setMessages(updated);setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:buildPrompt(products,store),
          messages:updated.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text})),
        }),
      });
      const data=await res.json();
      setMessages(p=>[...p,{role:"assistant",text:data.content?.[0]?.text||"Maafi chahta hoon, dobara try karein."}]);
    }catch{
      setMessages(p=>[...p,{role:"assistant",text:"Connection mein masla hua. WhatsApp karein! 📱"}]);
    }
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const quickQs=["Corolla brake pads price?","Mazda T3500 parts hain?","Engine oil konsa best?","WhatsApp number do"];

  if(!loaded) return(
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:48}}>🔧</div>
      <div style={{color:"#c1121f",fontWeight:800,fontSize:16}}>AlSyed Autoparts</div>
      <div style={{color:"#444",fontSize:13}}>Loading products...</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",maxHeight:"100vh",
      background:"linear-gradient(160deg,#0a0a0f 0%,#1a0505 100%)",
      display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',Tahoma,sans-serif",overflow:"hidden"}}>

      {showAdmin&&<Admin products={products} setProducts={setProducts} store={store} setStore={setStore} onClose={()=>setShowAdmin(false)}/>}

      {iosGuide&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.92)",
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{width:"100%",maxWidth:480,background:"#0f0f18",borderRadius:"20px 20px 0 0",padding:24}}>
            <div style={{color:"#fff",fontWeight:900,fontSize:17,marginBottom:16}}>📱 iPhone Pe Install</div>
            {[["1️⃣","Share button dabao","neeche (□↑)"],["2️⃣","'Add to Home Screen'","scroll karke dhundhein"],["3️⃣","'Add' dabao","✅ Done!"]].map(([n,s,sub])=>(
              <div key={s} style={{display:"flex",gap:12,background:"#1a1a2e",borderRadius:10,padding:"11px 14px",marginBottom:8}}>
                <span style={{fontSize:20}}>{n}</span>
                <div><div style={{color:"#f0f0f0",fontSize:14,fontWeight:600}}>{s}</div><div style={{color:"#666",fontSize:12,marginTop:2}}>{sub}</div></div>
              </div>
            ))}
            <button onClick={()=>setIosGuide(false)} style={{width:"100%",marginTop:12,padding:"12px",background:"#c1121f",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Samajh Gaya ✓</button>
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,#c1121f 0%,#7f0000 100%)",padding:"11px 14px",display:"flex",alignItems:"center",gap:11,boxShadow:"0 4px 20px rgba(193,18,31,0.4)",flexShrink:0}}>
        <div style={{width:44,height:44,borderRadius:13,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"2px solid rgba(255,255,255,0.25)",flexShrink:0}}>🔧</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#fff",fontWeight:900,fontSize:15}}>AlSyed Autoparts</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",flexShrink:0,animation:"pulse 2s infinite"}}/>
            <span style={{color:"rgba(255,255,255,0.75)",fontSize:11}}>Saim AI • {products.filter(p=>p.stock).length} parts ready</span>
          </div>
        </div>
        <div style={{display:"flex",gap:7}}>
          {(installPrompt||isIOS)&&(<button onClick={install} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:9,padding:"7px 9px",cursor:"pointer",fontSize:15}}>📲</button>)}
          <button onClick={()=>openWA()} style={{background:"#25D366",border:"none",borderRadius:9,padding:"7px 9px",cursor:"pointer",fontSize:16}}>📱</button>
          <button onClick={()=>setShowAdmin(true)} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:9,padding:"7px 9px",cursor:"pointer",fontSize:15}}>⚙️</button>
        </div>
      </div>

      <div style={{background:"#110505",borderBottom:"1px solid #1f0a0a",padding:"6px 14px",display:"flex",gap:14,overflowX:"auto",flexShrink:0}}>
        {[["🕐","9am–9pm"],["📍","Karachi"],["🚚","Delivery"],["🚛","Mazda T3500"],["⭐","Warranty"]].map(([i,t])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:3,color:"#555",fontSize:11,whiteSpace:"nowrap",flexShrink:0}}><span>{i}</span><span>{t}</span></div>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"13px 11px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:7,animation:"si 0.25s ease"}}>
            {msg.role==="assistant"&&(<div style={{width:30,height:30,borderRadius:9,flexShrink:0,background:"linear-gradient(135deg,#c1121f,#7f0000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔧</div>)}
            <div style={{maxWidth:"78%",padding:"10px 13px",borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:msg.role==="user"?"linear-gradient(135deg,#c1121f,#7f0000)":"#1c1c2e",color:"#f0f0f0",fontSize:14,lineHeight:1.6,border:msg.role==="assistant"?"1px solid #2a2a40":"none",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {msg.text}
              {msg.role==="assistant"&&(msg.text.toLowerCase().includes("whatsapp")||msg.text.toLowerCase().includes("order"))&&(
                <button onClick={()=>openWA(`Chatbot se: ${msg.text.substring(0,60)}`)} style={{display:"block",marginTop:8,background:"#25D366",border:"none",borderRadius:8,padding:"7px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>📱 WhatsApp — {store.whatsapp_display}</button>
              )}
            </div>
          </div>
        ))}
        {loading&&(<div style={{display:"flex",alignItems:"flex-end",gap:7}}><div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#c1121f,#7f0000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔧</div><div style={{background:"#1c1c2e",border:"1px solid #2a2a40",borderRadius:"16px 16px 16px 4px",padding:"11px 15px"}}><Dots/></div></div>)}
        {showQuick&&(
          <div style={{marginTop:4}}>
            <div style={{color:"#2a2a2a",fontSize:11,textAlign:"center",marginBottom:7}}>— Jaldi poochein —</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
              {quickQs.map(q=>(<button key={q} onClick={()=>send(q)} style={{background:"transparent",border:"1px solid #3a1010",borderRadius:20,padding:"7px 13px",color:"#c1121f",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{padding:"9px 11px 14px",background:"#08080f",borderTop:"1px solid #1a1a2e",flexShrink:0}}>
        <button onClick={()=>openWA()} style={{width:"100%",padding:"9px",marginBottom:8,background:"linear-gradient(135deg,#128C7E,#075E54)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <span style={{fontSize:16}}>📱</span>Direct Order — {store.whatsapp_display} (Syed Imran Shah)
        </button>
        <div style={{display:"flex",gap:7,background:"#1c1c2e",borderRadius:13,padding:"7px 7px 7px 13px",border:"1px solid #2a2a40"}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Part ka naam ya sawaal..." disabled={loading} style={{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:14,outline:"none",fontFamily:"inherit",caretColor:"#c1121f"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{width:38,height:38,borderRadius:9,border:"none",flexShrink:0,background:input.trim()&&!loading?"linear-gradient(135deg,#c1121f,#7f0000)":"#1a1a2e",color:"#fff",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:15,transition:"all 0.2s"}}>{loading?"⏳":"➤"}</button>
        </div>
        <div style={{textAlign:"center",marginTop:6,fontSize:10,color:"#1f1f1f"}}>AlSyed Autoparts 🇵🇰 • Powered by Claude AI</div>
      </div>

      <style>{`
        @keyframes td{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-6px);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes si{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:3px}
        input::placeholder{color:#3a3a4a}
      `}</style>
    </div>
  );
}
