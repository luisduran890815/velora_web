// =========================================================
// VELORA · Panel de administración (Supabase Auth + DB + Storage)
// =========================================================
const CFG = window.VELORA_CONFIG || {};
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes('TU-PROYECTO')) {
  $('#login-status').textContent = 'Configura SUPABASE_URL y SUPABASE_ANON_KEY en assets/js/config.js';
  $('#login-status').classList.add('error');
  throw new Error('Supabase sin configurar');
}
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const BUCKET = 'media';
let images = [];   // [{url, alt}]
let allLeads = [];

// ---------- Sesión ----------
const showPanel = (on) => { $('#login-view').hidden = on; $('#panel-view').hidden = !on; if (on) { loadPosts(); loadLeads(); } };
sb.auth.getSession().then(({ data }) => showPanel(!!data.session));
sb.auth.onAuthStateChange((_e, s) => showPanel(!!s));

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const st = $('#login-status');
  st.className = 'status'; st.textContent = 'Ingresando...';
  const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
  if (error) { st.textContent = 'Correo o contraseña incorrectos.'; st.classList.add('error'); }
});
$('#logout').onclick = () => sb.auth.signOut();

// ---------- Pestañas ----------
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  $('#tab-posts').hidden = t.dataset.tab !== 'posts';
  $('#tab-leads').hidden = t.dataset.tab !== 'leads';
});

// ---------- Formulario de publicación ----------
const form = $('#post-form');
const F = form.elements; // evita conflictos con form.id / form.title
const setType = () => form.dataset.type = F.type.value;
F.type.onchange = setType;

const resetForm = () => {
  form.reset();
  F.id.value = '';
  F.date.value = new Date().toISOString().slice(0, 10);
  F.published.checked = true;
  images = [];
  renderThumbs();
  setType();
  $('#form-title').textContent = 'Nueva publicación';
  $('#post-status').textContent = '';
};
$('#cancel-edit').onclick = resetForm;

const renderThumbs = () => {
  $('#thumbs').innerHTML = images.map((im, i) => `
    <div class="thumb"><img src="${esc(im.url)}" alt="">
      <button type="button" data-del="${i}" title="Quitar">×</button>
      <div class="order"><button type="button" data-left="${i}">◀</button><button type="button" data-right="${i}">▶</button></div>
    </div>`).join('');
};
$('#thumbs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.del) images.splice(+b.dataset.del, 1);
  if (b.dataset.left && +b.dataset.left > 0) { const i = +b.dataset.left; [images[i - 1], images[i]] = [images[i], images[i - 1]]; }
  if (b.dataset.right && +b.dataset.right < images.length - 1) { const i = +b.dataset.right; [images[i + 1], images[i]] = [images[i], images[i + 1]]; }
  renderThumbs();
});

// Comprime la imagen antes de subir (máx 1600 px, JPG 82 %)
const compress = (file) => new Promise((res) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return res(file);
  const img = new Image();
  img.onload = () => {
    const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(b => res(b || file), 'image/jpeg', 0.82);
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => res(file);
  img.src = URL.createObjectURL(file);
});

$('#files').addEventListener('change', async (e) => {
  const st = $('#post-status');
  const files = [...e.target.files];
  for (const [n, file] of files.entries()) {
    st.className = 'status'; st.textContent = `Subiendo imagen ${n + 1} de ${files.length}...`;
    const blob = await compress(file);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'img');
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type });
    if (error) { st.textContent = 'Error subiendo imagen: ' + error.message; st.classList.add('error'); continue; }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    images.push({ url: data.publicUrl, alt: F.title.value || '' });
    renderThumbs();
  }
  st.textContent = 'Imágenes listas. Recuerda Guardar.';
  e.target.value = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = $('#post-status'); st.className = 'status';
  const type = F.type.value;
  const row = {
    type,
    title: F.title.value.trim(),
    date: F.date.value,
    summary: F.summary.value.trim() || null,
    body: type === 'articulo' ? F.body.value.trim() || null : null,
    youtube_url: type === 'video' ? F.youtube_url.value.trim() || null : null,
    images: type === 'video' ? [] : images.map(i => ({ url: i.url, alt: i.alt || F.title.value.trim() })),
    published: F.published.checked
  };
  if (type === 'video' && !row.youtube_url) { st.textContent = 'Falta el enlace de YouTube.'; st.classList.add('error'); return; }
  if (type === 'foto' && !row.images.length) { st.textContent = 'Agrega al menos una imagen.'; st.classList.add('error'); return; }

  st.textContent = 'Guardando...';
  const q = F.id.value ? sb.from('posts').update(row).eq('id', F.id.value) : sb.from('posts').insert(row);
  const { error } = await q;
  if (error) { st.textContent = 'Error: ' + error.message; st.classList.add('error'); return; }
  resetForm();
  $('#post-status').textContent = 'Guardado ✔';
  loadPosts();
});

// ---------- Lista de publicaciones ----------
const TYPE_LABEL = { foto: 'Fotos', articulo: 'Artículo', video: 'Video' };
let postsCache = [];
async function loadPosts() {
  const { data, error } = await sb.from('posts').select('*').order('date', { ascending: false });
  if (error) { $('#post-list').textContent = 'Error: ' + error.message; return; }
  postsCache = data;
  $('#post-list').innerHTML = data.length ? data.map(p => `
    <div class="item">
      <div><span class="badge">${TYPE_LABEL[p.type]}</span>${p.published ? '' : '<span class="badge off">Oculto</span>'}
        <strong>${esc(p.title)}</strong><div class="meta">${esc(p.date)}${p.images?.length ? ` · ${p.images.length} imagen(es)` : ''}</div></div>
      <div class="actions-mini"><button data-edit="${p.id}">Editar</button><button class="del" data-remove="${p.id}">Eliminar</button></div>
    </div>`).join('') : '<p>Aún no hay publicaciones.</p>';
}
$('#post-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) {
    const p = postsCache.find(x => x.id === b.dataset.edit);
    F.id.value = p.id; F.type.value = p.type; F.date.value = p.date;
    F.title.value = p.title || ''; F.summary.value = p.summary || '';
    F.body.value = p.body || ''; F.youtube_url.value = p.youtube_url || '';
    F.published.checked = p.published;
    images = [...(p.images || [])]; renderThumbs(); setType();
    $('#form-title').textContent = 'Editar publicación';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (b.dataset.remove && confirm('¿Eliminar esta publicación?')) {
    const { error } = await sb.from('posts').delete().eq('id', b.dataset.remove);
    if (error) alert(error.message); else loadPosts();
  }
});

// ---------- Solicitudes ----------
const ESTADOS = ['Nuevo', 'Contactado', 'Cotizado', 'Cerrado', 'Descartado'];
async function loadLeads() {
  const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
  if (error) { $('#lead-table').innerHTML = `<tr><td>Error: ${esc(error.message)}</td></tr>`; return; }
  allLeads = data;
  $('#lead-table').innerHTML = `<tr><th>Fecha</th><th>Nombre</th><th>Celular</th><th>Correo</th><th>Ciudad</th><th>Seguro</th><th>Mensaje</th><th>Estado</th></tr>` +
    (data.length ? data.map(l => `<tr>
      <td>${new Date(l.created_at).toLocaleString('es-CO')}</td>
      <td>${esc(l.nombre)}</td>
      <td><a href="https://wa.me/${esc(l.celular.replace(/\D/g, '').replace(/^(?!57)(\d{10})$/, '57$1'))}" target="_blank">${esc(l.celular)}</a></td>
      <td>${esc(l.email)}</td><td>${esc(l.ciudad)}</td><td>${esc(l.tipo_seguro)}</td><td>${esc(l.mensaje)}</td>
      <td><select data-lead="${l.id}">${ESTADOS.map(s => `<option${s === l.estado ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
    </tr>`).join('') : '<tr><td colspan="8">Aún no hay solicitudes.</td></tr>');
}
$('#lead-table').addEventListener('change', async (e) => {
  if (!e.target.dataset.lead) return;
  const { error } = await sb.from('leads').update({ estado: e.target.value }).eq('id', e.target.dataset.lead);
  if (error) alert(error.message);
});

$('#export-csv').onclick = () => {
  const cols = ['created_at', 'nombre', 'celular', 'email', 'ciudad', 'tipo_seguro', 'mensaje', 'estado'];
  const head = ['Fecha', 'Nombre', 'Celular', 'Correo', 'Ciudad', 'Seguro', 'Mensaje', 'Estado'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rows = allLeads.map(l => cols.map(c => cell(c === 'created_at' ? new Date(l[c]).toLocaleString('es-CO') : l[c])).join(';'));
  const csv = '\uFEFF' + [head.join(';'), ...rows].join('\r\n'); // ; y BOM para Excel en español
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `solicitudes_velora_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

resetForm();
