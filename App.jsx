import { useState, useRef, useEffect } from "react";

// ── PERSISTENT STORAGE ─────────────────────────────────────────────
const STORAGE_KEY = "alsyed-products";
const STORE_KEY = "alsyed-store";

const DEFAULT_PRODUCTS = [
  { id: 1, category: "Toyota", name: "Corolla Brake Pads", original: 3200, oem: 1800, stock: true },
  { id: 2, category: "Toyota", name: "Corolla Air Filter", original: 800, oem: 500, stock: true },
  { id: 3, category: "Toyota", name: "Corolla Oil Filter", original: 450, oem: 280, stock: true },
  { id: 4, category: "Toyota", name: "Corolla Timing Belt Kit", original: 8500, oem: 5500, stock: true },
  { id: 5, category: "Toyota", name: "Fortuner Brake Disc (pair)", original: 12000, oem: 8500, stock: false },
  { id: 6, category: "Honda", name: "Civic Brake Pads (2016-2024)", original: 3500, oem: 2000, stock: true },
  { id: 7, category: "Honda", name: "City Air Filter", original: 700, oem: 450, stock: true },
  { id: 8, category: "Honda", name: "HR-V CVT Filter", original: 4200, oem: 0, stock: true },
  { id: 9, category: "Suzuki", name: "Mehran/Alto Brake Shoes", original: 900, oem: 600, stock: true },
  { id: 10, category: "Suzuki", name: "Cultus Clutch Plate", original: 3800, oem: 2500, stock: true },
  { id: 11, category: "Suzuki", name: "Every Van Timing Chain Kit", original: 6500, oem: 0, stock: true },
  { id: 12, category: "Kia/Hyundai", name: "Sportage Brake Pads", original: 4500, oem: 2800, stock: true },
  { id: 13, category: "Motorcycle", name: "Honda 125 Brake Shoes", original: 350, oem: 220, stock: true },
  { id: 14, category: "Motorcycle", name: "Yamaha YBR Chain Sprocket Kit", original: 1800, oem: 1200, stock: true },
  { id: 15, category: "Engine Oil", name: "Mobil 1 5W-30 (4L)", original: 4200, oem: 0, stock: true },
  { id: 16, category: "Engine Oil", name: "Shell Helix HX7 (4L)", original: 2800, oem: 0, stock: true },
  { id: 17, category: "Engine Oil", name: "Total Quartz 5W-40 (4L)", original: 3100, oem: 0, stock: true },
];

const DEFAULT_STORE = {
  name: "AlSyed Autoparts",
  whatsapp: "923001234567",
  whatsapp_display: "0300-1234567",
  location: "Karachi, Pakistan",
  timing: "Subah 9 baje se Raat 9 baje tak",
  juma: "Juma 2-4 baje band",
  delivery: "Karachi mein free delivery (Rs. 1500+ orders)",
  warranty_original: "6 months",
  warranty_oem: "3 months",
};

const loadData = async (key, fallback) => {
  try {
    const result = await window.storage.get(key);
    return result ? JSON.parse(result.value) : fallback;
  } catch { return fallback; }
};

const saveData = async (key, data) => {
  try { await window.storage.set(key, JSON.stringify(data)); } catch {}
};

// ── SYSTEM PROMPT BUILDER ──────────────────────────────────────────
const buildPrompt = (products, store) => {
  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  let productText = "";
  Object.entries(grouped).forEach(([cat, items]) => {
    productText += `\n${cat}:\n`;
    items.forEach(p => {
      const oem = p.oem > 0 ? ` | OEM: Rs.${p.oem.toLocaleString()}` : "";
      const status = p.stock ? "" : " [OUT OF STOCK - order available]";
      productText += `  • ${p.name}: Original Rs.${p.original.toLocaleString()}${oem}${status}\n`;
    });
  });

  return `Tum "${store.name}" ke friendly aur professional AI sales assistant ho. Tumhara naam "Saim" hai.

DUKAAN INFO:
• Naam: ${store.name}
• WhatsApp: ${store.whatsapp_display}
• Location: ${store.location}
• Timing: ${store.timing} (${store.juma})
• Delivery: ${store.delivery}
• Warranty: Original pe ${store.warranty_original} | OEM pe ${store.warranty_oem}

AVAILABLE PRODUCTS:
${productText}

TUMHARA ANDAAZ:
• Roman Urdu mein baat karo (customer jo language use kare)
• "Ji", "Sir/Madam", "Shukriya" hamesha use karo
• Price poochne pe Original AUR OEM dono batao (jab available)
• Out of stock parts ke liye bolao: "Abhi stock nahi, lekin order de sakte hain, 2-3 din mein milega"
• Order ya contact ke liye WhatsApp forward karo: ${store.whatsapp_display}
• Agar koi part list mein nahi: honestly bolao aur order option do
• Short, helpful, friendly jawab do — paragraph mat likho
• Kabhi bhi auto parts ke ilawa topic pe mat jao

IMPORTANT: Sirf AlSyed Autoparts ke products aur car/bike maintenance ke baare mein baat karo.`;
};

// ── COMPONENTS ─────────────────────────────────────────────────────
const CATS = ["Toyota", "Honda", "Suzuki", "Kia/Hyundai", "Motorcycle", "Engine Oil", "Other"];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "2px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#c1121f",
          animation: "td 1.2s infinite", animationDelay: `${i*0.2}s`
        }}/>
      ))}
    </div>
  );
}

// ── ADMIN PANEL ────────────────────────────────────────────────────
function AdminPanel({ products, setProducts, store, setStore, onClose }) {
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({ category: "Toyota", name: "", original: "", oem: "", stock: true });
  const [storeForm, setStoreForm] = useState(store);
  const [saved, setSaved] = useState(false);

  const grouped = {};
  products.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });

  const addProduct = () => {
    if (!newP.name.trim() || !newP.original) return;
    const updated = [...products, {
      id: Date.now(), category: newP.category, name: newP.name.trim(),
      original: Number(newP.original), oem: Number(newP.oem) || 0, stock: newP.stock,
    }];
    setProducts(updated);
    saveData(STORAGE_KEY, updated);
    setNewP({ category: "Toyota", name: "", original: "", oem: "", stock: true });
    setShowAdd(false);
  };

  const updateP = (id, field, val) => {
    const updated = products.map(p => p.id === id ? { ...p, [field]: val } : p);
    setProducts(updated);
    saveData(STORAGE_KEY, updated);
  };

  const deleteP = (id) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveData(STORAGE_KEY, updated);
  };

  const saveStore = () => {
    setStore(storeForm);
    saveData(STORE_KEY, storeForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const iStyle = {
    width: "100%", padding: "9px 11px", background: "#12121f",
    border: "1px solid #2a2a3e", borderRadius: 8, color: "#f0f0f0",
    fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 480, background: "#0f0f18",
        borderRadius: "20px 20px 0 0", border: "1px solid #2a1a1a",
        maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #c1121f, #8b0000)",
          padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>⚙️ Admin Panel</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 }}>
              {products.length} products • {products.filter(p => p.stock).length} in stock
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
            color: "#fff", cursor: "pointer", padding: "7px 14px", fontWeight: 800,
            fontSize: 13, fontFamily: "inherit",
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#0a0a12", borderBottom: "1px solid #1a1a2e" }}>
          {[["products", "📦 Products"], ["store", "🏪 Store Info"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "11px", border: "none", cursor: "pointer",
              background: tab === key ? "#1a1a2e" : "transparent",
              color: tab === key ? "#fff" : "#555",
              fontWeight: tab === key ? 800 : 400, fontSize: 13,
              borderBottom: tab === key ? "2px solid #c1121f" : "2px solid transparent",
              fontFamily: "inherit", transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>

          {tab === "products" && (
            <>
              {/* Add button */}
              {!showAdd ? (
                <button onClick={() => setShowAdd(true)} style={{
                  width: "100%", padding: "11px", background: "transparent",
                  border: "2px dashed #c1121f40", borderRadius: 10, color: "#c1121f",
                  cursor: "pointer", fontWeight: 800, fontSize: 14, marginBottom: 14,
                  fontFamily: "inherit", transition: "all 0.2s",
                }}>+ Naya Product Add Karein</button>
              ) : (
                <div style={{ background: "#1a0a0a", borderRadius: 12, padding: 14, border: "1px solid #c1121f40", marginBottom: 14 }}>
                  <div style={{ color: "#c1121f", fontWeight: 800, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>✨ NAYA PRODUCT</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={newP.category} onChange={e => setNewP(p => ({...p, category: e.target.value}))} style={iStyle}>
                      {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input placeholder="Part ka naam (zaruri) *" value={newP.name} onChange={e => setNewP(p => ({...p, name: e.target.value}))} style={iStyle}/>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input placeholder="Original Price *" type="number" value={newP.original} onChange={e => setNewP(p => ({...p, original: e.target.value}))} style={iStyle}/>
                      <input placeholder="OEM Price (0=N/A)" type="number" value={newP.oem} onChange={e => setNewP(p => ({...p, oem: e.target.value}))} style={iStyle}/>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#ccc", fontSize: 13 }}>
                      <input type="checkbox" checked={newP.stock} onChange={e => setNewP(p => ({...p, stock: e.target.checked}))}
                        style={{ width: 16, height: 16, accentColor: "#c1121f" }}/>
                      Stock mein available hai
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={addProduct} style={{
                        flex: 2, padding: "10px", background: "#c1121f", border: "none",
                        borderRadius: 8, color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                      }}>✓ Add Karein</button>
                      <button onClick={() => setShowAdd(false)} style={{
                        flex: 1, padding: "10px", background: "transparent", border: "1px solid #333",
                        borderRadius: 8, color: "#666", cursor: "pointer", fontFamily: "inherit",
                      }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Product list */}
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, color: "#c1121f", letterSpacing: 2,
                    textTransform: "uppercase", marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <div style={{ flex: 1, height: 1, background: "#1a1a2e" }}/>
                    {cat} ({items.length})
                    <div style={{ flex: 1, height: 1, background: "#1a1a2e" }}/>
                  </div>
                  {items.map(p => (
                    <div key={p.id} style={{
                      background: "#1a1a2e", borderRadius: 10, padding: "10px 12px",
                      marginBottom: 6, border: `1px solid ${p.stock ? "#2a2a3e" : "#3a1010"}`,
                      opacity: p.stock ? 1 : 0.65,
                    }}>
                      {editing === p.id ? (
                        <div style={{ display: "grid", gap: 7 }}>
                          <input value={p.name} onChange={e => updateP(p.id, "name", e.target.value)} style={iStyle} placeholder="Part naam"/>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                            <input type="number" value={p.original} onChange={e => updateP(p.id, "original", Number(e.target.value))} style={iStyle} placeholder="Original"/>
                            <input type="number" value={p.oem} onChange={e => updateP(p.id, "oem", Number(e.target.value))} style={iStyle} placeholder="OEM"/>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#ccc", fontSize: 12 }}>
                              <input type="checkbox" checked={p.stock} onChange={e => updateP(p.id, "stock", e.target.checked)} style={{ accentColor: "#c1121f" }}/>
                              Stock mein hai
                            </label>
                            <button onClick={() => setEditing(null)} style={{
                              background: "#c1121f", border: "none", borderRadius: 7,
                              color: "#fff", padding: "6px 16px", cursor: "pointer", fontWeight: 800, fontSize: 12,
                            }}>✓ Save</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#f0f0f0", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.stock ? "🟢" : "🔴"} {p.name}
                            </div>
                            <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                              Rs.{p.original.toLocaleString()}
                              {p.oem > 0 && <span style={{ color: "#555" }}> • OEM Rs.{p.oem.toLocaleString()}</span>}
                            </div>
                          </div>
                          <button onClick={() => setEditing(p.id)} style={{ background: "transparent", border: "1px solid #2a2a3e", borderRadius: 6, cursor: "pointer", padding: "5px 9px", fontSize: 13 }}>✏️</button>
                          <button onClick={() => deleteP(p.id)} style={{ background: "transparent", border: "1px solid #3a1a1a", borderRadius: 6, cursor: "pointer", padding: "5px 9px", fontSize: 13 }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {tab === "store" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: "0 0 4px" }}>
                Yahan apni dukaan ki info update karein
              </div>
              {[
                ["Dukaan ka Naam", "name"],
                ["WhatsApp Number (country code ke saath)", "whatsapp"],
                ["Display Number (customers ke liye)", "whatsapp_display"],
                ["Location", "location"],
                ["Timing", "timing"],
                ["Juma Timing", "juma"],
                ["Delivery Info", "delivery"],
                ["Original Warranty", "warranty_original"],
                ["OEM Warranty", "warranty_oem"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#c1121f", display: "block", marginBottom: 5, letterSpacing: 0.5 }}>
                    {label.toUpperCase()}
                  </label>
                  <input value={storeForm[key]} onChange={e => setStoreForm(f => ({...f, [key]: e.target.value}))}
                    style={iStyle} placeholder={label}/>
                </div>
              ))}
              <button onClick={saveStore} style={{
                width: "100%", padding: "13px", marginTop: 4,
                background: saved ? "#16a34a" : "linear-gradient(135deg, #c1121f, #8b0000)",
                border: "none", borderRadius: 10, color: "#fff",
                fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.3s",
              }}>
                {saved ? "✓ Saved!" : "💾 Store Info Save Karein"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [store, setStore] = useState(DEFAULT_STORE);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Assalamu Alaikum! 👋\nMain Saim hoon — AlSyed Autoparts ka AI Assistant.\n\nCar ya bike ke kisi bhi part ke baare mein poochein — price, availability, ya koi bhi sawaal! 🔧\n\nMain 24/7 available hoon! 🕐",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load from persistent storage on mount
  useEffect(() => {
    (async () => {
      const savedProducts = await loadData(STORAGE_KEY, DEFAULT_PRODUCTS);
      const savedStore = await loadData(STORE_KEY, DEFAULT_STORE);
      setProducts(savedProducts);
      setStore(savedStore);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickQs = [
    "Corolla brake pads kitne ka?",
    "Engine oil konsa best hai?",
    "Delivery hoti hai?",
    "WhatsApp number do",
  ];

  const openWhatsApp = (msg = "") => {
    const text = msg || `Assalamu Alaikum! AlSyed Autoparts se information chahiye.`;
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    setShowQuick(false);
    const newMsg = { role: "user", text: userText };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const apiMsgs = updated.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildPrompt(products, store),
          messages: apiMsgs,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Maafi chahta hoon, dobara try karein.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection mein masla hua. Dobara try karein ya WhatsApp karein." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
        <div style={{ color: "#c1121f", fontWeight: 800 }}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", maxHeight: "100vh",
      background: "linear-gradient(160deg, #0a0a0f 0%, #1a0505 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      overflow: "hidden",
    }}>
      {showAdmin && (
        <AdminPanel
          products={products} setProducts={setProducts}
          store={store} setStore={setStore}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, #c1121f 0%, #7f0000 100%)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 4px 20px rgba(193,18,31,0.4)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, border: "2px solid rgba(255,255,255,0.25)", flexShrink: 0,
        }}>🔧</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 16, letterSpacing: -0.3 }}>
            AlSyed Autoparts
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
              boxShadow: "0 0 6px #4ade80", flexShrink: 0,
              animation: "pulse 2s infinite",
            }}/>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
              Saim AI • Online • {products.filter(p=>p.stock).length} parts available
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* WhatsApp button */}
          <button onClick={() => openWhatsApp()} style={{
            background: "#25D366", border: "none", borderRadius: 10,
            padding: "8px 10px", cursor: "pointer", fontSize: 18,
            boxShadow: "0 2px 10px rgba(37,211,102,0.4)",
          }}>📱</button>
          {/* Admin button */}
          <button onClick={() => setShowAdmin(true)} style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 10, padding: "8px 10px", cursor: "pointer",
            color: "#fff", fontSize: 16,
          }}>⚙️</button>
        </div>
      </div>

      {/* ── STORE INFO BAR ── */}
      <div style={{
        background: "#110505", borderBottom: "1px solid #1f0a0a",
        padding: "7px 16px", display: "flex", gap: 16,
        overflowX: "auto", flexShrink: 0,
      }}>
        {[
          ["🕐", store.timing.split(" ").slice(0,3).join(" ")],
          ["📍", store.location],
          ["🚚", "Delivery available"],
          ["⭐", `Warranty: ${store.warranty_original}`],
        ].map(([icon, text]) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "#555", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            <span>{icon}</span><span>{text}</span>
          </div>
        ))}
      </div>

      {/* ── MESSAGES ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "14px 12px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end", gap: 7,
            animation: "si 0.25s ease",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg, #c1121f, #7f0000)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>🔧</div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #c1121f, #7f0000)"
                : "#1c1c2e",
              color: "#f0f0f0", fontSize: 14, lineHeight: 1.6,
              border: msg.role === "assistant" ? "1px solid #2a2a40" : "none",
              boxShadow: msg.role === "user" ? "0 3px 12px rgba(193,18,31,0.3)" : "0 2px 8px rgba(0,0,0,0.3)",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {msg.text}
              {/* WhatsApp button in bot messages that mention order/contact */}
              {msg.role === "assistant" && (msg.text.includes("WhatsApp") || msg.text.includes("order")) && (
                <button onClick={() => openWhatsApp(`Chatbot se aya hoon. ${msg.text.substring(0, 80)}...`)}
                  style={{
                    display: "block", marginTop: 8,
                    background: "#25D366", border: "none", borderRadius: 8,
                    padding: "6px 12px", color: "#fff", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  }}>
                  📱 WhatsApp Par Order Karein
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: "linear-gradient(135deg, #c1121f, #7f0000)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>🔧</div>
            <div style={{
              background: "#1c1c2e", border: "1px solid #2a2a40",
              borderRadius: "16px 16px 16px 4px", padding: "11px 16px",
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Quick questions */}
        {showQuick && (
          <div style={{ marginTop: 6, animation: "si 0.3s ease" }}>
            <div style={{ color: "#333", fontSize: 11, textAlign: "center", marginBottom: 8 }}>
              — Jaldi poochein —
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {quickQs.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  background: "transparent", border: "1px solid #3a1010",
                  borderRadius: 20, padding: "7px 13px", color: "#c1121f",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s",
                }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT ── */}
      <div style={{
        padding: "10px 12px 16px", background: "#08080f",
        borderTop: "1px solid #1a1a2e", flexShrink: 0,
      }}>
        {/* WhatsApp direct bar */}
        <button onClick={() => openWhatsApp()} style={{
          width: "100%", padding: "9px", marginBottom: 8,
          background: "linear-gradient(135deg, #128C7E, #075E54)",
          border: "none", borderRadius: 10, color: "#fff",
          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: "0 2px 12px rgba(18,140,126,0.3)",
        }}>
          <span style={{ fontSize: 16 }}>📱</span>
          WhatsApp Par Direct Order Karein — {store.whatsapp_display}
        </button>

        <div style={{
          display: "flex", gap: 8, background: "#1c1c2e",
          borderRadius: 14, padding: "8px 8px 8px 14px",
          border: "1px solid #2a2a40",
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Part ka naam ya koi sawaal..."
            disabled={loading}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#f0f0f0", fontSize: 14, outline: "none",
              fontFamily: "inherit", caretColor: "#c1121f",
            }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
            width: 40, height: 40, borderRadius: 10, border: "none", flexShrink: 0,
            background: input.trim() && !loading
              ? "linear-gradient(135deg, #c1121f, #7f0000)"
              : "#1a1a2e",
            color: "#fff", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            fontSize: 16, transition: "all 0.2s",
            boxShadow: input.trim() && !loading ? "0 3px 10px rgba(193,18,31,0.4)" : "none",
          }}>{loading ? "⏳" : "➤"}</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 7, fontSize: 10, color: "#222" }}>
          Powered by Claude AI 🤖 • AlSyed Autoparts 🇵🇰
        </div>
      </div>

      <style>{`
        @keyframes td { 0%,60%,100%{transform:translateY(0);opacity:.3} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes si { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 3px; }
        input::placeholder { color: #444; }
      `}</style>
    </div>
  );
}

