import './style.css'

const $ = (selecteur, racine = document) => racine.querySelector(selecteur);
const listeListe = $('#liste');
const listeVide = $('#vide');
const filtreTous = $('#filtreTous');
const filtreFavoris = $('#filtreFavoris');
const filtreNotes = $('#filtreNotes');
const filtreEnvie = $('#filtreEnvie');
const statistiques = document.getElementById('statistiques');
const inputRecherche = document.getElementById('saisieRecherche');
const boutonRechercher = document.getElementById('boutonRechercher');
const resultatsRecherche = document.getElementById('resultatsRecherche');
const statutRecherche = $('#statutRecherche');
const derniersFilms = document.getElementById('derniersFilms');
const accueilVide = document.getElementById('accueilVide');
const navAccueil = document.getElementById('navAccueil');
const navRecherche = document.getElementById('navRecherche');
const navCollection = document.getElementById('navCollection');
const sectionAccueil = document.querySelector('.accueil-wrap');
const sectionRecherche = document.querySelector('.search-wrap');
const sectionCollection = document.querySelector('.container');
const boutonTheme = $('#basculeTheme');

const CLE_STOCKAGE = 'movieTracker.movies_v1';
const CLE_THEME = 'movieTracker.theme_v1';
const CLE_OMDB = '4e9504cc';

let donnees = JSON.parse(localStorage.getItem(CLE_STOCKAGE) || '[]');

const afficher = () => {
  listeListe.innerHTML = '';

  const tableau = films.map((film, i) => Object.assign({ _idx: i }, film));
  let visibles = (() => {
    if (filtreFavoris && filtreFavoris.classList.contains('active')) return tableau.filter(f => f.fav);
    if (filtreNotes && filtreNotes.classList.contains('active')) return tableau.filter(f => typeof f.rating === 'number');
    if (filtreEnvie && filtreEnvie.classList.contains('active')) return tableau.filter(f => f.wish);
    return tableau;
  })();

 

  visibles.forEach((film) => {
    const carte = document.createElement('article');
    carte.className = 'card';
    carte.dataset.idx = film._idx;
    carte.dataset.id = film.id;
    carte.innerHTML = `
      <div class="posterWrap">
        <img class="poster" src="${film.poster || ''}" alt="${film.title}" onerror="this.src=''; this.closest('.posterWrap').classList.add('noimg')" />
      </div>
      <div class="meta">
        <h3 class="title">${film.title}</h3>
        <p class="sub">${film.year} · ${film.rating ?? '-'} /10</p>
        <div class="actions">
          <button class="fav ${film.fav ? 'active' : ''}" data-film-id="${film.id}">${film.fav ? '★ Favori' : '☆ Favori'}</button>
          <button class="wish ${film.wish ? 'active' : ''}" data-film-id="${film.id}">${film.wish ? '👁 Envie ✓' : '👁 Envie'}</button>
          <button class="del" data-film-id="${film.id}">Supprimer</button>
        </div>
      </div>
    `;

    listeListe.appendChild(carte);
  });
};

const sauvegarder = () => localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees));

const gestionnaire = {
  set(cible, propriete, valeur) {
    cible[propriete] = valeur;
    sauvegarder();
    afficher();
    return true;
  }
};

const films = new Proxy(donnees, gestionnaire);



function modifierFilm(index, film) { films[index] = Object.assign(films[index] || {}, film); }

function supprimerFilm(index) {
  const carte = listeListe.querySelector(`article[data-idx="${index}"]`);
  if (carte) carte.classList.add('removing');
  setTimeout(() => {
    films.splice(index, 1);
  }, 250);
}

function appliquerTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CLE_THEME, theme);
}

boutonTheme.addEventListener('click', () => {
  const themeActuel = document.documentElement.getAttribute('data-theme') || 'light';
  appliquerTheme(themeActuel === 'light' ? 'dark' : 'light');
});

const themeSauvegarde = localStorage.getItem(CLE_THEME) || 'light';
appliquerTheme(themeSauvegarde);

afficher();

listeListe.addEventListener('click', (e) => {
  const bouton = e.target.closest('button');
  if (!bouton) return;
  
  const filmId = bouton.dataset.filmId;
  if (!filmId) return;
  
  const idx = films.findIndex(f => f.id === filmId);
  if (idx === -1) return;
  
  if (bouton.classList.contains('del')) {
    e.stopPropagation();
    supprimerFilm(idx);
  } else if (bouton.classList.contains('fav')) {
    e.stopPropagation();
    basculerFavori(idx);
  } else if (bouton.classList.contains('wish')) {
    e.stopPropagation();
    basculerEnvie(idx);
  }
});

async function rechercherOmdb(requete) {
  resultatsRecherche.innerHTML = '';
  statutRecherche.textContent = 'Recherche...';
  try {
    const url = `https://www.omdbapi.com/?apikey=${CLE_OMDB}&s=${encodeURIComponent(requete)}&type=movie`;
    const reponse = await fetch(url);
    const donnees = await reponse.json();
    if (!donnees || donnees.Response === 'False') {
      statutRecherche.textContent = donnees?.Error || 'Aucun résultat.';
      return;
    }
    statutRecherche.textContent = `Résultats: ${donnees.Search.length}`;
    donnees.Search.forEach((film) => {
      const carte = document.createElement('article');
      carte.className = 'card';
      carte.innerHTML = `
        <div class="posterWrap">
          <img class="poster" src="${film.Poster && film.Poster !== 'N/A' ? film.Poster : ''}" alt="${film.Title}" onerror="this.src=''; this.closest('.posterWrap').classList.add('noimg')" />
        </div>
        <div class="meta">
          <h3 class="title">${film.Title}</h3>
          <p class="sub">${film.Year}</p>
        </div>
      `;
      carte.addEventListener('click', async () => {
        const details = await obtenirDetailsFilm(film.imdbID);
        if (details) ouvrirModal(details);
      });
      resultatsRecherche.appendChild(carte);
    });
  } catch (erreur) {
    console.error(erreur);
    statutRecherche.textContent = 'Erreur réseau.';
  }
}

async function obtenirDetailsFilm(imdbId) {
  try {
    const url = `https://www.omdbapi.com/?apikey=${CLE_OMDB}&i=${imdbId}&plot=full`;
    const reponse = await fetch(url);
    const donnees = await reponse.json();
    if (!donnees || donnees.Response === 'False') {
      console.error('Erreur détails film:', donnees?.Error);
      return null;
    }
    return {
      id: donnees.imdbID,
      title: donnees.Title,
      year: donnees.Year,
      poster: donnees.Poster !== 'N/A' ? donnees.Poster : '',
      plot: donnees.Plot !== 'N/A' ? donnees.Plot : '',
      genre: donnees.Genre !== 'N/A' ? donnees.Genre : '',
      runtime: donnees.Runtime !== 'N/A' ? donnees.Runtime : ''
    };
  } catch (erreur) {
    console.error('Erreur récupération détails:', erreur);
    return null;
  }
}

boutonRechercher && boutonRechercher.addEventListener('click', () => {
  const recherche = inputRecherche.value.trim();
  if (!recherche) return statutRecherche.textContent = 'Saisis un mot-clé.';
  rechercherOmdb(recherche);
});

inputRecherche && inputRecherche.addEventListener('keydown', (e) => { 
  if (e.key === 'Enter') boutonRechercher.click(); 
});

function basculerFavori(index) {
  if (!films[index]) return;
  const actuel = films[index];
  const modifie = Object.assign({}, actuel, { 
    fav: !actuel.fav, 
    updatedAt: Date.now() 
  });
  films[index] = modifie;
}

function basculerEnvie(index) {
  if (!films[index]) return;
  const actuel = films[index];
  const nouvelleValeur = actuel.wish === true ? false : true;
  const modifie = Object.assign({}, actuel, { 
    wish: nouvelleValeur, 
    updatedAt: Date.now() 
  });
  films[index] = modifie;
}

function activerFiltre(bouton) {
  [filtreTous, filtreFavoris, filtreNotes, filtreEnvie].forEach(b => b && b.classList.remove('active'));
  bouton.classList.add('active');
  afficher();
}

filtreEnvie && filtreEnvie.addEventListener('click', () => activerFiltre(filtreEnvie));
filtreTous && filtreTous.addEventListener('click', () => activerFiltre(filtreTous));
filtreFavoris && filtreFavoris.addEventListener('click', () => activerFiltre(filtreFavoris));
filtreNotes && filtreNotes.addEventListener('click', () => activerFiltre(filtreNotes));

const modale = document.getElementById('modale');
const boutonFermerModale = document.getElementById('fermerModale');
const affichePoster = document.getElementById('posterModale');
const titreMod = document.getElementById('titreMod');
const sousTitreMod = document.getElementById('sousTitreMod');
const metaDonnees = document.getElementById('metaDonnees');
const descriptionFilm = document.getElementById('descriptionFilm');
const notationEtoiles = document.getElementById('notationEtoiles');
const valeurNote = document.getElementById('valeurNote');
const boutonEnvieModal = document.getElementById('envieModale');
const boutonFavoriModal = document.getElementById('favoriModale');
let idActuel = null;

function trouverIndexParId(id) {
  return films.findIndex(f => f.id === id);
}

function creerOuModifierFilm(film) {
  const index = trouverIndexParId(film.id);
  if (index === -1) {
    films.push({ 
      id: film.id, 
      title: film.title, 
      year: film.year, 
      poster: film.poster || '',
      plot: film.plot || '',
      genre: film.genre || '',
      runtime: film.runtime || '',
      rating: film.rating ?? undefined, 
      fav: film.fav ?? false, 
      wish: film.wish ?? false, 
      createdAt: Date.now() 
    });
    return films.length - 1;
  } else {
    films[index] = Object.assign({}, films[index], film, { id: film.id });
    return index;
  }
}

function afficherEtoiles(valeur = 0) {
  const note = Math.max(0, Math.min(10, Number(valeur) || 0));
  notationEtoiles.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const etoile = document.createElement('span');
    etoile.className = 'star' + (i <= note ? ' active' : '');
    etoile.textContent = '★';
    etoile.dataset.value = String(i);
    notationEtoiles.appendChild(etoile);
  }
  valeurNote.textContent = note ? `${note}/10` : '';
}

function ouvrirModal(infos, ajouterACollection = true) {
  idActuel = infos.id;
  
  let film;
  if (ajouterACollection) {
    const index = creerOuModifierFilm(infos);
    film = films[index];
  } else {
    const indexExistant = trouverIndexParId(infos.id);
    if (indexExistant !== -1) {
      film = films[indexExistant];
    } else {
      film = infos;
    }
  }
  
  affichePoster.src = film.poster || '';
  affichePoster.onerror = () => { affichePoster.src = ''; };
  titreMod.textContent = film.title;
  sousTitreMod.textContent = film.year || '';
  
  let metaHTML = '';
  if (film.genre) metaHTML += `<span><strong>Genre:</strong> ${film.genre}</span>`;
  if (film.runtime) metaHTML += `<span><strong>Durée:</strong> ${film.runtime}</span>`;
  metaDonnees.innerHTML = metaHTML;
  
  descriptionFilm.textContent = film.plot || '';
  
  afficherEtoiles(film.rating || 0);
  boutonEnvieModal.classList.toggle('active', !!film.wish);
  boutonFavoriModal.classList.toggle('active', !!film.fav);
  modale.classList.remove('hidden');
  modale.setAttribute('aria-hidden', 'false');
}

function fermerModal() {
  modale.classList.add('hidden');
  modale.setAttribute('aria-hidden', 'true');
  idActuel = null;
}

modale.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) fermerModal();
});

boutonFermerModale && boutonFermerModale.addEventListener('click', fermerModal);

notationEtoiles && notationEtoiles.addEventListener('click', (e) => {
  const cible = e.target;
  if (!(cible instanceof HTMLElement)) return;
  if (!cible.classList.contains('star')) return;
  const valeur = Number(cible.dataset.value || 0);
  if (!idActuel) return;
  const index = trouverIndexParId(idActuel);
  if (index === -1) return;
  modifierFilm(index, { rating: valeur, updatedAt: Date.now() });
  afficherEtoiles(valeur);
});

function basculerModalAction(type) {
  if (!idActuel) return;
  let index = trouverIndexParId(idActuel);
  if (index === -1) {
    films.push({
      id: idActuel,
      title: titreMod.textContent,
      year: sousTitreMod.textContent,
      poster: affichePoster.src,
      plot: descriptionFilm.textContent,
      genre: '',
      runtime: '',
      wish: type === 'wish',
      fav: type === 'fav',
      createdAt: Date.now()
    });
    index = films.length - 1;
  } else {
    modifierFilm(index, { [type]: !films[index][type], updatedAt: Date.now() });
  }
  const bouton = type === 'wish' ? boutonEnvieModal : boutonFavoriModal;
  bouton.classList.toggle('active', films[index][type]);
}

boutonEnvieModal?.addEventListener('click', () => basculerModalAction('wish'));
boutonFavoriModal?.addEventListener('click', () => basculerModalAction('fav'));

function changerPage(pageActive) {
  const pages = { accueil: [navAccueil, sectionAccueil], recherche: [navRecherche, sectionRecherche], collection: [navCollection, sectionCollection] };
  Object.entries(pages).forEach(([nom, [nav, section]]) => {
    const estActif = nom === pageActive;
    nav?.classList.toggle('active', estActif);
    if (section) section.style.display = estActif ? 'block' : 'none';
  });
}

navAccueil?.addEventListener('click', () => changerPage('accueil'));
navRecherche?.addEventListener('click', () => changerPage('recherche'));
navCollection?.addEventListener('click', () => changerPage('collection'));
