import React, { useContext, useMemo, useRef, useState } from 'react';
import './Chatbot.css';
import { ShopContext } from '../../Context/ShopContext';
import { Link } from 'react-router-dom';
import { WishlistContext } from '../../Context/WishlistContext';

const systemPrompts = [
  'Ask me about products, categories, prices, or style tips. Try: "Show women t-shirts under $30" or "What is this site about?"'
];

const normalize = (s) => String(s || '').toLowerCase();
const STOPWORDS = new Set(['show','me','the','a','an','to','and','or','for','with','please','site','website','this','is','about','under','below','between','than','less','more','of','at','in','some','any','do','you','have']);
const SYNONYMS = new Map([
  // tops
  ['tshirt','t-shirt'], ['tshirts','t-shirt'], ['tee','t-shirt'], ['tees','top'],
  // align to dataset terms
  ['t-shirt','blouse'], ['tshirts','blouse'], ['tshirt','blouse'],
  ['top','top'], ['tops','top'], ['blouse','blouse'],
  // outerwear
  ['hoodies','jacket'], ['hoodie','jacket'], ['sweatshirt','jacket'], ['sweatshirts','jacket'],
  ['shoe','shoes'], ['sneaker','shoes'], ['sneakers','shoes'],
  ['sandal','shoes'], ['sandals','shoes'], ['trainer','shoes'], ['trainers','shoes'],
  ['jeans','jeans'], ['denim','jeans'], ['trouser','pants'], ['trousers','pants'], ['pant','pants'], ['pants','pants'],
  ['shirt','shirt'], ['shirts','shirt'], ['dress','dress'], ['dresses','dress'], ['skirt','skirt'], ['skirts','skirt'], ['jacket','jacket'], ['jackets','jacket'],
  ['women','women'], ['womens','women'], ["women's",'women'],
  ['men','men'], ['mens','men'], ["men's",'men'],
  ['kid','kid'], ['kids','kid'],
]);

const CATEGORY_TERMS = ['men','women','kid'];

function editDistance(a,b){
  a = a || ''; b = b || '';
  const dp = Array(b.length+1).fill(0).map((_,i)=>[i]);
  for(let j=0;j<=a.length;j++){ dp[0][j]=j; }
  for(let i=1;i<=b.length;i++){
    for(let j=1;j<=a.length;j++){
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[j-1]===b[i-1]?0:1)
      );
    }
  }
  return dp[b.length][a.length];
}

function bestCategory(tokens){
  let best = null, bestScore = Infinity;
  for(const t of tokens){
    for(const cat of CATEGORY_TERMS){
      const d = editDistance(t, cat);
      if(d < bestScore){ bestScore = d; best = cat; }
    }
  }
  return bestScore <= 2 ? best : null; // tolerate small typos
}

function tokenize(q){
  return normalize(q)
    .replace(/\$/g,'')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(t=>SYNONYMS.get(t) || t)
    .filter(t=>!STOPWORDS.has(t));
}

function searchProducts(products, query) {
  const q = normalize(query);
  const tokens = tokenize(q);

  // Price filters
  const exactNumber = q.match(/\$?(\d+)/g)?.map(n=>Number(n)).filter(n=>!Number.isNaN(n)) || [];
  let priceMin = null, priceMax = null;
  const betweenMatch = q.match(/between\s*\$?(\d+)\s*(and|to|-)\s*\$?(\d+)/);
  if (betweenMatch) {
    const a = Number(betweenMatch[1]);
    const b = Number(betweenMatch[3]);
    priceMin = Math.min(a,b); priceMax = Math.max(a,b);
  } else if (/under|below|less than/.test(q) && exactNumber.length){
    priceMax = exactNumber[exactNumber.length-1];
  } else if (/over|above|more than/.test(q) && exactNumber.length){
    priceMin = exactNumber[exactNumber.length-1];
  }

  // Category hints
  let wantMen = tokens.includes('men');
  let wantWomen = tokens.includes('women');
  let wantKid = tokens.includes('kid');
  if(!wantMen && !wantWomen && !wantKid){
    const bc = bestCategory(tokens);
    if (bc==='men') wantMen = true;
    if (bc==='women') wantWomen = true;
    if (bc==='kid') wantKid = true;
  }

  // Score items
  const scored = products.map(p=>{
    const name = normalize(`${p.name} ${p.category}`);
    const words = name.split(/[^a-z0-9]+/).filter(Boolean);
    let score = 0;
    if (wantMen && p.category === 'men') score += 3;
    if (wantWomen && p.category === 'women') score += 3;
    if (wantKid && p.category === 'kid') score += 3;
    // direct token hits
    const directHits = tokens.filter(t=>name.includes(t)).length;
    score += directHits * 2;
    // fuzzy hits (typo tolerance)
    for (const t of tokens){
      let best = Infinity;
      for (const w of words){
        const d = editDistance(t, w);
        if (d < best) best = d;
        if (best === 0) break;
      }
      if (best === 1) score += 1; // minor typo
      if (best === 2 && t.length > 4) score += 0.5; // allow small distance for longer tokens
    }
    // hyphen-insensitive tshirt
    if (tokens.includes('tshirt') && name.includes('t-shirt')) score += 2;
    return { p, score };
  });

  // Apply price range filter
  let filtered = scored.filter(({p})=>{
    const price = Number(p.new_price);
    if (priceMin!=null && price < priceMin) return false;
    if (priceMax!=null && price > priceMax) return false;
    return true;
  });

  // If a category term was present, hard filter to that category
  if (wantMen || wantWomen || wantKid){
    filtered = filtered.filter(({p})=>
      (wantMen && p.category==='men') || (wantWomen && p.category==='women') || (wantKid && p.category==='kid')
    );
  }

  // If no tokens after stopword removal, don't overfilter—just return best priced subset if price is specified
  if (tokens.length === 0 && (priceMin!=null || priceMax!=null)){
    filtered.sort((a,b)=> (a.p.new_price - b.p.new_price));
    return filtered.slice(0,8).map(x=>x.p);
  }

  // Sort by score desc, then price asc
  filtered.sort((a,b)=> b.score - a.score || (a.p.new_price - b.p.new_price));
  return filtered.filter(x=>x.score>0).slice(0,8).map(x=>x.p);
}

function buildAnswer(query, products) {
  const q = normalize(query);
  if (!q.trim()) {
    return { text: "Hi! I can help you explore the store. Ask for categories, price ranges, or product names.", items: [] };
  }
  if (!products || products.length === 0){
    return { text: "I am loading the catalog. Please try again in a moment or refresh the page.", items: [] };
  }
  // Trending / new arrivals intent
  if (/(trend|trending|latest|new\s+(arrivals|items|collection))/.test(q)) {
    const tokens = tokenize(q);
    // infer category if mentioned or via typo-tolerant bestCategory
    let wantMen = tokens.includes('men');
    let wantWomen = tokens.includes('women');
    let wantKid = tokens.includes('kid');
    if(!wantMen && !wantWomen && !wantKid){
      const bc = bestCategory(tokens);
      if (bc==='men') wantMen = true;
      if (bc==='women') wantWomen = true;
      if (bc==='kid') wantKid = true;
    }
    let pool = products;
    if (wantMen) pool = pool.filter(p=>p.category==='men');
    if (wantWomen) pool = pool.filter(p=>p.category==='women');
    if (wantKid) pool = pool.filter(p=>p.category==='kid');
    // Heuristic: consider higher IDs as newer; otherwise randomize
    const trending = [...pool].sort((a,b)=> (b.id - a.id) || (a.new_price - b.new_price)).slice(0,6);
    if (trending.length) {
      const scope = wantMen? 'men' : wantWomen? 'women' : wantKid? 'kids' : 'all';
      return { text: `Trending ${scope} picks right now:`, items: trending };
    }
    return { text: "I couldn't find trending items for that category.", items: [] };
  }
  if (/what\s+is\s+(this|the)\s+(site|website)/.test(q) || /about\s+this\s+website/.test(q)) {
    return { text: "This is an e‑commerce store for fashion items across Men, Women, and Kids. You can browse categories, compare prices, try items virtually, add to cart, and save favorites in your wishlist.", items: [] };
  }
  if (/hello|hi|hey/.test(q)) {
    return { text: "Hello! Ask me for products (e.g., 'women t‑shirts under $30') or say a category like 'mens hoodies'.", items: [] };
  }

  const results = searchProducts(products, query).slice(0, 6);
  if (results.length === 0) {
    // Smart fallback: suggest popular/cheapest in a hinted category or global
    const tokens = tokenize(q);
    const wantMen = tokens.includes('men');
    const wantWomen = tokens.includes('women');
    const wantKid = tokens.includes('kid');
    let pool = products;
    if (wantMen) pool = products.filter(p=>p.category==='men');
    if (wantWomen) pool = products.filter(p=>p.category==='women');
    if (wantKid) pool = products.filter(p=>p.category==='kid');
    const suggestions = [...pool].sort((a,b)=> (a.new_price - b.new_price)).slice(0,6);
    if (suggestions.length){
      return { text: "I couldn't find an exact match. Here are some close suggestions:", items: suggestions };
    }
    return { text: "I couldn't find matching items. Try changing the category or price range.", items: [] };
  }
  return { text: `Here are some matches (${results.length} shown):`, items: results };
}

export const Chatbot = () => {
  const { all_product } = useContext(ShopContext);
  const { toggleWishlist, isWishlisted } = useContext(WishlistContext);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', content: systemPrompts[0] },
    { role: 'assistant', content: 'Hi! I\'m your shopping assistant. How can I help?' }
  ]);
  const listRef = useRef(null);
  const [thinking, setThinking] = useState(false);
  const [context, setContext] = useState({ lastCategory: null, lastPriceMin: null, lastPriceMax: null });
  const isLoggedIn = !!localStorage.getItem('auth-token');

  const handleAsk = () => {
    const q = input.trim();
    if (!q) return;
    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);
    setInput('');
    setTimeout(() => {
      const answer = buildAnswer(q, all_product);
      const botMsg = { role: 'assistant', content: answer.text, items: answer.items };
      setMessages(prev => [...prev, botMsg]);
      setThinking(false);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 0);
    }, 150); // brief delay for UX
  };

  const quickChips = useMemo(() => [
    'Show women t-shirts under $30',
    'mens hoodies',
    'kids shoes between $20 and $50',
    'trending now',
    'what is this website?',
  ], []);

  return (
    <div className="chatbot-root">
      {!open && (
        <button className="chatbot-fab" onClick={() => setOpen(true)} aria-label="Open assistant">
          💬
        </button>
      )}
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <strong>Shop Assistant</strong>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="chatbot-body" ref={listRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`msg msg-${m.role}`}>
                <div className="msg-text">{m.content}</div>
                {Array.isArray(m.items) && m.items.length > 0 && (
                  <div className="results">
                    {m.items.map(item => (
                      <div key={item.id} className={`result-card ${!isLoggedIn ? 'result-card-disabled' : ''}`}>
                        {isLoggedIn ? (
                          <Link to={`/product/${item.id}`} className="rc-link" onClick={() => setOpen(false)}>
                            <img src={item.image} alt={item.name} />
                            <div className="rc-meta">
                              <div className="rc-name">{item.name}</div>
                              <div className="rc-price">${item.new_price}</div>
                            </div>
                          </Link>
                        ) : (
                          <div className="rc-link disabled" title="Login to explore details">
                            <img src={item.image} alt={item.name} />
                            <div className="rc-meta">
                              <div className="rc-name">{item.name}</div>
                              <div className="rc-price">${item.new_price}</div>
                              <div className="rc-note">Login to view details</div>
                            </div>
                          </div>
                        )}
                        <div className="rc-actions">
                          <button
                            className={`rc-wish ${!isLoggedIn ? 'rc-wish-disabled' : ''}`}
                            onClick={() => { if (isLoggedIn) toggleWishlist(item.id); }}
                            aria-label={isWishlisted(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                            disabled={!isLoggedIn}
                            title={!isLoggedIn ? 'Login to use wishlist' : ''}
                          >
                            {isWishlisted(item.id) ? '♥' : '♡'}
                          </button>
                          {!isLoggedIn && (
                            <Link className="rc-login" to="/login" onClick={() => setOpen(false)}>Login</Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="msg msg-assistant"><div className="msg-text">Thinking…</div></div>
            )}
          </div>
          <div className="chatbot-chips">
            {quickChips.map((c) => (
              <button key={c} className="chip" onClick={() => { setInput(c); }}>
                {c}
              </button>
            ))}
          </div>
          <div className="chatbot-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, categories, or price..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            />
            <button onClick={handleAsk}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
