// All iteration happens here. Edit this file on GitHub → Commit → refresh iPhone.
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const uid = ()=>Math.random().toString(36).slice(2,10);
const now = ()=>new Date().toISOString();

const KEY = 'lagree.routines.v1';
const loadAll = ()=>{ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const saveAll = (list)=> localStorage.setItem(KEY, JSON.stringify(list));

function parseTimeInput(val){
  if(!val) return 0;
  val = String(val).trim();
  if(/^\d+$/.test(val)) return parseInt(val,10);
  const parts = val.split(':');
  if(parts.length===2){
    const m = parseInt(parts[0],10)||0, s=parseInt(parts[1],10)||0;
    return m*60 + s;
  }
  const n = parseInt(val,10);
  return isNaN(n)?0:n;
}
function fmt(sec){
  sec = Math.max(0, Math.floor(sec||0));
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function escapeHtml(str){return String(str||'').replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[s]));}

let routines = loadAll();
let currentId = null;

function totalTime(r){ return (r.blocks||[]).reduce((acc,b)=> acc + (b.moves||[]).reduce((a,m)=> a + (m.seconds||0), 0), 0); }
function totalMovesCount(r){ return (r.blocks||[]).reduce((acc,b)=> acc + (b.moves?.length||0), 0); }

function renderList(){
  const q = $('#search').value.trim().toLowerCase();
  const cat = $('#filterCategory').value;
  const sort = $('#sortOrder').value;
  let items = [...routines];
  if(q){
    items = items.filter(r => {
      const hay = [r.title, r.category, (r.tags||[]).join(','), JSON.stringify(r.blocks), r.notes||''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  if(cat) items = items.filter(r=> r.category===cat);

  items.sort((a,b)=>{
    if(sort==='updated') return (b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt);
    if(sort==='created') return b.createdAt.localeCompare(a.createdAt);
    if(sort==='title') return (a.title||'').localeCompare(b.title||'');
    return 0;
  });

  const root = $('#routineList');
  root.innerHTML = '';
  if(!items.length){ root.innerHTML = '<div style="color:#9aa4b2; font-size:12px">No routines found.</div>'; return; }
  for(const r of items){
    const total = totalTime(r);
    const card = document.createElement('div');
    card.className = 'panel'; // simple card
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:8px">
        <div style="font-weight:800">${escapeHtml(r.title||'(untitled)')}</div>
        <span style="background:#1a2230; border:1px solid #1f2630; padding:4px 8px; border-radius:999px; font-size:12px">${escapeHtml(r.category||'')}</span>
      </div>
      <div style="color:#9aa4b2; font-size:12px">⏱ ${fmt(total)} • 🧱 ${(r.blocks?.length||0)} blocks</div>
      <div style="color:#9aa4b2; font-size:11px">Updated ${new Date(r.updatedAt||r.createdAt).toLocaleString()}</div>
    `;
    card.addEventListener('click', ()=> openRoutine(r.id));
    root.appendChild(card);
  }
}

function openRoutine(id){
  currentId = id;
  const r = routines.find(x=> x.id===id);
  if(!r) return;
  $('#emptyState').style.display = 'none';
  $('#editor').style.display = 'block';
  $('#crumbs').textContent = (r.title ? `${r.title} • ${r.category}` : `(untitled) • ${r.category}`);
  $('#titleInput').value = r.title || '';
  $('#categoryInput').value = r.category || 'Signature';
  $('#tagsInput').value = (r.tags||[]).join(', ');

  renderBlocks(r);
  updateTotals(r);
  renderList();
}

function renderBlocks(r){
  const root = $('#blocksContainer');
  root.innerHTML = '';
  (r.blocks||[]).forEach((b, idx)=>{
    const blockEl = document.createElement('div');
    blockEl.className = 'panel';
    blockEl.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px">
        <input data-block="name" data-bid="${b.id}" type="text" value="${escapeHtml(b.name||`Block ${idx+1}`)}"/>
        <span style="margin-left:auto; background:#0d1826; border:1px solid #1f2630; padding:6px 8px; border-radius:999px; font-weight:800">⏱ <span data-block-total="${b.id}">${fmt(blockTotal(b))}</span></span>
        <button class="btn secondary" data-add-move="${b.id}">＋ Move</button>
        <button class="btn secondary" data-del-block="${b.id}">Remove</button>
      </div>
      <div id="tbody-${b.id}"></div>
    `;
    root.appendChild(blockEl);
    const tb = blockEl.querySelector('#tbody-'+b.id);
    (b.moves||[]).forEach(m=> tb.appendChild(renderMoveRow(r,b,m)));
  });

  root.querySelectorAll('input[data-block="name"]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const bid = e.target.getAttribute('data-bid');
      const blk = r.blocks.find(x=> x.id===bid);
      if(blk){ blk.name = e.target.value; touch(r); persist(); }
    });
  });
  root.querySelectorAll('button[data-add-move]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const bid = e.target.getAttribute('data-add-move');
      const blk = r.blocks.find(x=> x.id===bid);
      if(!blk.moves) blk.moves = [];
      blk.moves.push({ id: uid(), name:'', seconds:0, variations:'', modifications:'', notes:'' });
      touch(r); persist(); renderBlocks(r); updateTotals(r);
    });
  });
  root.querySelectorAll('button[data-del-block]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const bid = e.target.getAttribute('data-del-block');
      r.blocks = r.blocks.filter(x=> x.id!==bid);
      touch(r); persist(); renderBlocks(r); updateTotals(r);
    });
  });
}

function renderMoveRow(r,b,m){
  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = 'minmax(160px,1fr) 120px 1fr 1fr auto';
  row.style.gap = '8px';
  row.style.margin = '6px 0';
  row.innerHTML = `
    <input data-move="name" data-mid="${m.id}" type="text" placeholder="Move name" value="${escapeHtml(m.name||'')}"/>
    <input data-move="time" data-mid="${m.id}" type="text" placeholder="MM:SS or SS" value="${m.seconds?fmt(m.seconds):''}" inputmode="numeric"/>
    <input data-move="variations" data-mid="${m.id}" type="text" placeholder="variations (comma)" value="${escapeHtml(m.variations||'')}"/>
    <input data-move="modifications" data-mid="${m.id}" type="text" placeholder="modifications (comma)" value="${escapeHtml(m.modifications||'')}"/>
    <button class="btn secondary" data-del-move="${m.id}">✕</button>
  `;
  row.querySelectorAll('input[data-move]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const mid = e.target.getAttribute('data-mid');
      const field = e.target.getAttribute('data-move');
      const mv = (b.moves||[]).find(x=> x.id===mid);
      if(mv){
        if(field==='time'){
          mv.seconds = parseTimeInput(e.target.value);
          document.querySelector(`[data-block-total="${b.id}"]`).textContent = fmt(blockTotal(b));
          updateTotals(r);
        } else {
          mv[field] = e.target.value;
        }
        touch(r); persist();
      }
    });
  });
  row.querySelector('button[data-del-move]').addEventListener('click', ()=>{
    b.moves = (b.moves||[]).filter(x=> x.id!==m.id);
    touch(r); persist();
    const tb = document.querySelector('#tbody-'+b.id);
    tb.innerHTML = ''; (b.moves||[]).forEach(m2=> tb.appendChild(renderMoveRow(r,b,m2)));
    document.querySelector(`[data-block-total="${b.id}"]`).textContent = fmt(blockTotal(b));
    updateTotals(r);
  });
  return row;
}

function blockTotal(b){ return (b.moves||[]).reduce((acc,m)=> acc + (m.seconds||0), 0); }
function updateTotals(r){
  $('#totalTime').textContent = fmt(totalTime(r));
  $('#totalMoves').textContent = totalMovesCount(r);
  $('#totalBlocks').textContent = r.blocks?.length || 0;
  $('#crumbs').textContent = r.title ? `${r.title} • ${r.category} • ⏱ ${fmt(totalTime(r))}` : `(untitled) • ${r.category} • ⏱ ${fmt(totalTime(r))}`;
}
function persist(){ saveAll(routines); renderList(); }
function touch(r){ r.updatedAt = now(); }

// New routine modal
function openNewModal(){
  const modal = document.getElementById('newModal');
  document.getElementById('newCategory').value='Signature';
  document.getElementById('newBlockCount').value=6;
  renderNewBlockNameInputs(6);
  modal.style.display='block';
}
function closeNewModal(){ document.getElementById('newModal').style.display='none'; }
function renderNewBlockNameInputs(n){
  const container = document.getElementById('newBlockNames');
  container.innerHTML = '';
  const defaults = ['Left Leg','Left Oblique','Right Leg','Right Oblique','Arms','Core'];
  for(let i=0;i<n;i++){
    const inp = document.createElement('input');
    inp.type='text';
    inp.placeholder = `Block ${i+1} name`;
    inp.value = defaults[i] || `Block ${i+1}`;
    inp.setAttribute('data-new-block-name', i);
    container.appendChild(inp);
  }
}

// Wire UI
document.getElementById('newRoutineBtn').addEventListener('click', openNewModal);
document.getElementById('emptyNewBtn').addEventListener('click', openNewModal);
document.getElementById('cancelNew').addEventListener('click', closeNewModal);
document.getElementById('newBlockCount').addEventListener('input', e=>{
  let n = parseInt(e.target.value||'1',10);
  n = Math.max(1, Math.min(12, n));
  renderNewBlockNameInputs(n);
});
document.getElementById('createNew').addEventListener('click', ()=>{
  const cat = document.getElementById('newCategory').value;
  const nameInputs = Array.from(document.querySelectorAll('input[data-new-block-name]'));
  const blocks = nameInputs.map(inp=> ({ id: uid(), name: inp.value.trim() || 'Block', moves: [] }));
  const r = { id: uid(), title: `${cat} routine`, category: cat, tags: [], blocks, createdAt: now(), updatedAt: now() };
  routines.unshift(r); persist(); closeNewModal(); openRoutine(r.id); document.getElementById('titleInput').focus();
});

document.getElementById('titleInput').addEventListener('input', e=>{ const r = routines.find(x=> x.id===currentId); if(r){ r.title = e.target.value; touch(r); persist(); updateTotals(r); } });
document.getElementById('categoryInput').addEventListener('change', e=>{ const r = routines.find(x=> x.id===currentId); if(r){ r.category = e.target.value; touch(r); persist(); updateTotals(r); } });
document.getElementById('tagsInput').addEventListener('input', e=>{ const r = routines.find(x=> x.id===currentId); if(r){ r.tags = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); touch(r); persist(); renderList(); } });

document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = JSON.stringify(routines, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'lagree-routines.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
});
document.getElementById('importInput').addEventListener('change', e=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try { const data = JSON.parse(reader.result); if(!Array.isArray(data)) throw new Error('Invalid file'); routines = data; persist(); renderList(); alert('Imported ✔'); }
    catch(err){ alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file); e.target.value='';
});

document.getElementById('search').addEventListener('input', renderList);
document.getElementById('filterCategory').addEventListener('change', renderList);
document.getElementById('sortOrder').addEventListener('change', renderList);

// First render
renderList();
if(routines.length){
  const latest = [...routines].sort((a,b)=> (b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt))[0];
  openRoutine(latest.id);
}
