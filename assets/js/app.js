// =========================================================
// VELORA · Sitio público
// =========================================================
const CFG = window.VELORA_CONFIG || {};
const $ = (s) => document.querySelector(s);
const configured = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('TU-PROYECTO');
const sb = configured && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

// Menú móvil
$('.menu')?.addEventListener('click', () => $('nav').classList.toggle('open'));
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => $('nav').classList.remove('open')));

// Datos de configuración en pantalla
document.querySelectorAll('[data-config]').forEach(el => el.textContent = CFG[el.dataset.config] || '');
$('#year').textContent = new Date().getFullYear();
$('#wa-float').href = `https://wa.me/${CFG.WHATSAPP}?text=${encodeURIComponent('Hola Velora, quiero información sobre sus seguros.')}`;

// Utilidades
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v) => esc(v).replace(/\r?\n/g, '<br>');
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const youtubeId = (url) => {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (h.endsWith('youtube.com') || h === 'youtube-nocookie.com') {
      return u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1] || '';
    }
  } catch { }
  return '';
};

const expandable = (text, label, limit = 220) => {
  const t = String(text ?? '').trim();
  if (!t) return '';
  if (t.length <= limit) return `<p>${fmt(t)}</p>`;
  return `<p>${fmt(t.slice(0, limit).trim())}...</p>
    <details><summary>${label}</summary><p class="full-text">${fmt(t)}</p></details>`;
};

// Carrusel
const carouselHTML = (images) => {
  const imgs = (images || []).filter(i => i && i.url);
  if (!imgs.length) return '<div class="placeholder">Imagen no disponible</div>';
  const slides = imgs.map(i => `<figure class="carousel-slide"><img loading="lazy" src="${esc(i.url)}" alt="${esc(i.alt || '')}"></figure>`).join('');
  const controls = imgs.length > 1 ? `
    <button class="carousel-button carousel-previous" type="button" aria-label="Anterior">&#10094;</button>
    <button class="carousel-button carousel-next" type="button" aria-label="Siguiente">&#10095;</button>
    <div class="carousel-counter">1 / ${imgs.length}</div>
    <div class="carousel-dots">${imgs.map((_, n) => `<button class="carousel-dot${n ? '' : ' is-active'}" type="button" data-go="${n}" aria-label="Foto ${n + 1}"></button>`).join('')}</div>` : '';
  return `<div class="photo-carousel"><div class="carousel-viewport"><div class="carousel-track">${slides}</div>${controls}</div></div>`;
};

const activateCarousels = () => {
  document.querySelectorAll('.photo-carousel').forEach(c => {
    const track = c.querySelector('.carousel-track');
    const slides = c.querySelectorAll('.carousel-slide');
    if (slides.length < 2) return;
    const dots = c.querySelectorAll('.carousel-dot');
    const counter = c.querySelector('.carousel-counter');
    let cur = 0, x0 = 0;
    const go = (n) => {
      cur = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === cur));
      counter.textContent = `${cur + 1} / ${slides.length}`;
    };
    c.querySelector('.carousel-previous').onclick = () => go(cur - 1);
    c.querySelector('.carousel-next').onclick = () => go(cur + 1);
    dots.forEach(d => d.onclick = () => go(+d.dataset.go));
    track.addEventListener('touchstart', e => x0 = e.changedTouches[0].clientX, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });
  });
};

// "Ver más" (muestra 3 inicialmente)
const VISIBLE = 3;
const limitSection = (container, label) => {
  const items = [...container.querySelectorAll(':scope > article')];
  if (items.length <= VISIBLE) return;
  items.slice(VISIBLE).forEach(i => i.hidden = true);
  const btn = document.createElement('button');
  btn.className = 'toggle-more';
  btn.textContent = `Ver más ${label} (${items.length - VISIBLE})`;
  btn.onclick = () => {
    const open = btn.dataset.open === '1';
    items.slice(VISIBLE).forEach(i => i.hidden = open);
    btn.dataset.open = open ? '0' : '1';
    btn.textContent = open ? `Ver más ${label} (${items.length - VISIBLE})` : 'Ver menos';
  };
  container.appendChild(btn);
};

// Render
const render = (posts) => {
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  const by = (t) => posts.filter(p => p.type === t);
  const empty = (txt) => `<p class="loading">${txt}</p>`;

  const fotos = by('foto');
  $('#photo-posts').innerHTML = fotos.length ? fotos.map(p => `
    <article class="card">${carouselHTML(p.images)}
      <p class="date">${fmtDate(p.date)}</p><h3>${esc(p.title)}</h3>
      ${expandable(p.summary, 'Ver descripción completa')}
    </article>`).join('') : empty('Pronto tendremos publicaciones.');
  activateCarousels();
  limitSection($('#photo-posts'), 'publicaciones');

  const arts = by('articulo');
  $('#text-posts').innerHTML = arts.length ? arts.map(p => `
    <article class="card">
      ${p.images?.[0]?.url ? `<img src="${esc(p.images[0].url)}" alt="" loading="lazy" style="border-radius:10px;margin-bottom:12px;aspect-ratio:16/9;object-fit:cover;width:100%">` : ''}
      <p class="date">${fmtDate(p.date)}</p><h3>${esc(p.title)}</h3>
      <p><strong>${fmt(p.summary)}</strong></p>
      ${p.body ? `<details><summary>Leer artículo completo</summary><p class="full-text">${fmt(p.body)}</p></details>` : ''}
    </article>`).join('') : empty('Pronto tendremos artículos.');
  limitSection($('#text-posts'), 'artículos');

  const vids = by('video');
  $('#video-posts').innerHTML = vids.length ? vids.map(p => {
    const id = youtubeId(p.youtube_url);
    return `<article class="card video">
      ${id ? `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${esc(p.title)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : '<div class="placeholder">Video no disponible</div>'}
      <p class="date">${fmtDate(p.date)}</p><h3>${esc(p.title)}</h3>
      ${expandable(p.summary, 'Ver descripción completa', 180)}
    </article>`;
  }).join('') : empty('Pronto tendremos videos.');
  limitSection($('#video-posts'), 'videos');
};

const loadPosts = async () => {
  try {
    if (sb) {
      const { data, error } = await sb.from('posts').select('*').eq('published', true);
      if (error) throw error;
      render(data || []);
    } else {
      // Modo demostración mientras configuras Supabase
      const r = await fetch('data/demo.json');
      render(await r.json());
    }
  } catch (e) {
    console.error('Error cargando publicaciones:', e);
    render([]);
  }
};
loadPosts();

// Formulario → Supabase + WhatsApp
$('#lead-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget;
  const status = $('#form-status');
  const btn = form.querySelector('button[type=submit]');
  const f = Object.fromEntries(new FormData(form));
  status.className = 'full status';

  if (f.empresa_web) return; // antispam
  if (!f.nombre?.trim() || !f.celular?.trim() || !f.tipo_seguro) {
    status.textContent = 'Completa nombre, celular y seguro de interés.';
    status.classList.add('error'); return;
  }
  if (!form.consentimiento.checked) {
    status.textContent = 'Debes autorizar el tratamiento de datos.';
    status.classList.add('error'); return;
  }

  btn.disabled = true;
  status.textContent = 'Registrando solicitud...';

  const lead = {
    nombre: f.nombre.trim(), celular: f.celular.trim(), email: f.email?.trim() || null,
    ciudad: f.ciudad?.trim() || null, tipo_seguro: f.tipo_seguro, mensaje: f.mensaje?.trim() || null,
    consentimiento: true
  };

  // Abrir la ventana antes del await evita el bloqueo de pop-ups en celulares
  const win = window.open('', '_blank');
  try {
    if (sb) {
      const { error } = await sb.from('leads').insert(lead);
      if (error) console.warn('No se guardó en Supabase:', error.message);
    }
    const msg = `Hola Velora, quiero información sobre un seguro.
Nombre: ${lead.nombre}
Celular: ${lead.celular}
Correo: ${lead.email || '-'}
Ciudad: ${lead.ciudad || '-'}
Seguro de interés: ${lead.tipo_seguro}
Mensaje: ${lead.mensaje || '-'}`;
    const url = `https://wa.me/${CFG.WHATSAPP}?text=${encodeURIComponent(msg)}`;
    if (win) win.location.href = url; else location.href = url;
    status.textContent = '¡Listo! Se abrió WhatsApp con tu solicitud. Solo presiona enviar.';
    form.reset();
  } catch (e) {
    win?.close();
    status.textContent = 'No fue posible registrar la solicitud. Inténtalo de nuevo.';
    status.classList.add('error');
  } finally {
    btn.disabled = false;
  }
});
