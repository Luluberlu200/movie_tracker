import './style.css'

// Simple Movie Tracker (vanilla JS)

// --- helpers ---
const $ = (sel, root = document) => root.querySelector(sel);
const qs = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// --- DOM refs ---
const listEl = $('#list');
const emptyEl = $('#empty');
const themeToggle = $('#themeToggle');
const searchInput = $('#searchInput');
const searchBtn = $('#searchBtn');
const searchResults = $('#searchResults');
const searchStatus = $('#searchStatus');
const filterAll = $('#filterAll');
const filterFav = $('#filterFav');
const filterRated = $('#filterRated');

// --- persistence keys ---
const STORAGE_KEY = 'movieTracker.movies_v1';
const THEME_KEY = 'movieTracker.theme_v1';
const OMDB_KEY = '4e9504cc'; // clé OMDb fournie

// --- model with Proxy for sync ---
let internal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const render = () => {
  listEl.innerHTML = '';
  // build list with original indices
  const arr = movies.map((m, i) => Object.assign({ _idx: i }, m));
  const visible = (() => {
    if (filterFav && filterFav.classList.contains('active')) return arr.filter(a => a.fav);
    if (filterRated && filterRated.classList.contains('active')) return arr.filter(a => typeof a.rating === 'number');
    return arr;
  })();

  if (!visible.length) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  visible.forEach((m) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.idx = m._idx;
    card.innerHTML = `
      <div class="posterWrap">
        <img class="poster" src="${m.poster || ''}" alt="${escapeHtml(m.title)}" onerror="this.src=''; this.closest('.posterWrap').classList.add('noimg')" />
      </div>
      <div class="meta">
        <h3 class="title">${escapeHtml(m.title)}</h3>
        <p class="sub">${m.year} · ${m.rating ?? '-'} /10</p>
        <div class="actions">
          <button class="fav">${m.fav ? '★' : '☆'} Favori</button>
          <button class="del">Supprimer</button>
        </div>
      </div>
    `;

  // events
  card.querySelector('.del').addEventListener('click', () => removeMovie(m._idx));
  card.querySelector('.fav').addEventListener('click', () => toggleFav(m._idx));

    listEl.appendChild(card);
  });
};

function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

const saveToStorage = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(internal));

const handler = {
  set(target, prop, value) {
    target[prop] = value;
    // whenever the array is mutated we re-render and persist
    saveToStorage();
    render();
    return true;
  }
};

const movies = new Proxy(internal, handler);

// --- CRUD operations ---
let editingIndex = -1;

// Formulaire manuel retiré — l'ajout se fait depuis la recherche OMDb

function addMovie(obj) { movies.push(obj); }
function updateMovie(idx, obj) { movies[idx] = Object.assign(movies[idx] || {}, obj); }

function removeMovie(idx) {
  const card = listEl.querySelector(`article[data-idx="${idx}"]`);
  if (card) card.classList.add('removing');
  // animation before removal
  setTimeout(() => {
    movies.splice(idx, 1);
  }, 250);
}

// plus de formulaire de saisie manuelle

// --- theme toggle ---
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'light' ? 'dark' : 'light');
});

// init theme
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);

// initial render
render();

// export for testing in console
window.__movies = movies;

// --- search OMDb ---
async function searchOmdb(query) {
  searchResults.innerHTML = '';
  searchStatus.textContent = 'Recherche...';
  const key = OMDB_KEY || '';
  try {
    const url = `https://www.omdbapi.com/?apikey=${key}&s=${encodeURIComponent(query)}&type=movie`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.Response === 'False') {
      searchStatus.textContent = data?.Error || 'Aucun résultat.';
      return;
    }
    searchStatus.textContent = `Résultats: ${data.Search.length}`;
    data.Search.forEach((m) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="posterWrap">
          <img class="poster" src="${m.Poster && m.Poster !== 'N/A' ? m.Poster : ''}" alt="${escapeHtml(m.Title)}" onerror="this.src=''; this.closest('.posterWrap').classList.add('noimg')" />
        </div>
        <div class="meta">
          <h3 class="title">${escapeHtml(m.Title)}</h3>
          <p class="sub">${m.Year}</p>
          <div class="actions">
            <button class="addFromSearch">Ajouter</button>
          </div>
        </div>
      `;
      card.querySelector('.addFromSearch').addEventListener('click', () => {
        const newMovie = { title: m.Title, year: m.Year, poster: m.Poster && m.Poster !== 'N/A' ? m.Poster : '', rating: undefined, fav: false, createdAt: Date.now() };
        addMovie(newMovie);
      });
      searchResults.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    searchStatus.textContent = 'Erreur réseau.';
  }
}

searchBtn && searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q) return searchStatus.textContent = 'Saisis un mot-clé.';
  searchOmdb(q);
});

searchInput && searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn.click(); });

// --- favorites & filters ---
function toggleFav(idx) {
  movies[idx].fav = !movies[idx].fav;
  movies[idx] = movies[idx]; // trigger proxy
}

function setActiveFilter(button) {
  [filterAll, filterFav, filterRated].forEach(b => b && b.classList.remove('active'));
  button.classList.add('active');
  render();
}
filterAll && filterAll.addEventListener('click', () => setActiveFilter(filterAll));
filterFav && filterFav.addEventListener('click', () => setActiveFilter(filterFav));
filterRated && filterRated.addEventListener('click', () => setActiveFilter(filterRated));

