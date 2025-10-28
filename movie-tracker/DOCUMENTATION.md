# 📚 Documentation Technique - Movie Tracker

**Projet:** Application de gestion de films  
**Auteur:** Lucas  
**Date:** Octobre 2025  
**Technologies:** JavaScript Vanilla, HTML5, CSS3, API OMDb

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Explication détaillée du code](#explication-détaillée-du-code)
4. [Concepts avancés](#concepts-avancés)
5. [API et données](#api-et-données)

---

## 🎯 Vue d'ensemble

Movie Tracker est une **Single Page Application (SPA)** permettant de :
- ✅ Rechercher des films via l'API OMDb
- ✅ Gérer une collection personnelle
- ✅ Noter les films (système 10 étoiles)
- ✅ Marquer des favoris et films "envie de voir"
- ✅ Filtrer sa collection
- ✅ Persister les données (localStorage)
- ✅ Thème dark/light

---

## 🏗️ Architecture

### Structure des fichiers
```
movie-tracker/
├── index.html          # Structure HTML
├── src/
│   ├── main.js        # Logique JavaScript (465 lignes)
│   └── style.css      # Styles CSS
└── public/
    └── logo_film.webp # Logo de l'application
```

### Flux de données

```
localStorage → donnees → Proxy(films) → afficher() → DOM
                  ↑                           ↓
                  └─────── sauvegarder() ─────┘
```

**Pattern réactif :** Toute modification du tableau `films` déclenche automatiquement :
1. Sauvegarde dans localStorage
2. Re-rendu de l'interface

---

## 📖 Explication détaillée du code

### 1️⃣ Imports & Sélecteurs DOM (lignes 1-23)

```javascript
import './style.css'

const $ = (selecteur, racine = document) => racine.querySelector(selecteur);
const listeListe = $('#liste');
const listeVide = $('#vide');
// ... autres sélecteurs
```

**💡 Explication :**
- **Import CSS** : Vite bundler intègre automatiquement le CSS
- **Fonction `$`** : Raccourci élégant pour `querySelector`
  - Paramètre optionnel `racine` permet de chercher dans un sous-arbre
  - Exemple : `$('.card', container)` cherche `.card` dans `container`
- **Sélecteurs stockés** : Évite de re-chercher les éléments à chaque fois (optimisation)

---

### 2️⃣ Constantes de configuration (lignes 25-27)

```javascript
const CLE_STOCKAGE = 'movieTracker.movies_v1';
const CLE_THEME = 'movieTracker.theme_v1';
const CLE_OMDB = '4e9504cc';
```

**💡 Explication :**
- **CLE_STOCKAGE** : Clé pour `localStorage` (suffixe `_v1` permet la migration future)
- **CLE_THEME** : Clé pour persister le thème sombre/clair
- **CLE_OMDB** : Clé API publique pour OMDb (Open Movie Database)

---

### 3️⃣ Chargement des données persistées (ligne 29)

```javascript
let donnees = JSON.parse(localStorage.getItem(CLE_STOCKAGE) || '[]');
```

**💡 Explication :**
- `localStorage.getItem()` : Récupère la chaîne JSON sauvegardée
- `JSON.parse()` : Transforme la chaîne en objet/tableau JavaScript
- `|| '[]'` : **Fallback** - si aucune donnée, retourne tableau vide
- `let` (mutable) : Permet de réassigner via le Proxy

---

### 4️⃣ Fonction d'affichage principale (lignes 31-83)

#### a) Filtrage des films

```javascript
const afficher = () => {
  listeListe.innerHTML = '';
  
  const tableau = films.map((film, i) => Object.assign({ _idx: i }, film));
  let visibles = (() => {
    if (filtreFavoris && filtreFavoris.classList.contains('active')) 
      return tableau.filter(f => f.fav);
    if (filtreNotes && filtreNotes.classList.contains('active')) 
      return tableau.filter(f => typeof f.rating === 'number');
    if (filtreEnvie && filtreEnvie.classList.contains('active')) 
      return tableau.filter(f => f.wish);
    return tableau;
  })();
```

**💡 Explication :**
- `innerHTML = ''` : Vide complètement la liste (méthode simple mais pas la plus performante)
- **`.map()`** : Ajoute l'index `_idx` à chaque film pour le retrouver facilement
- **IIFE** `(() => {...})()` : Fonction Immediately Invoked Function Expression
  - Exécutée immédiatement
  - Retourne le résultat du filtrage
- **`.filter()`** : Crée un nouveau tableau avec seulement les éléments qui passent le test
- **Vérifications multiples** :
  - `filtreFavoris && ...` : Short-circuit - vérifie d'abord que l'élément existe
  - `classList.contains('active')` : Vérifie si la classe CSS est présente

#### b) Gestion de la liste vide

```javascript
if (!visibles.length) {
  listeVide.style.display = 'block';
  return;
}
listeVide.style.display = 'none';
```

**💡 Explication :**
- `!visibles.length` : Si 0 élément (falsy)
- `return` : Sort de la fonction (pas besoin de continuer)
- Sinon, cache le message "liste vide"

#### c) Création dynamique des cartes

```javascript
visibles.forEach((film) => {
  const carte = document.createElement('article');
  carte.className = 'card';
  carte.dataset.idx = film._idx;
  carte.dataset.id = film.id;
  carte.innerHTML = `
    <div class="posterWrap">
      <div class="badges">
        ${film.fav ? '<span class="badge heart">❤</span>' : ''}
        ${film.wish ? '<span class="badge wish">👁</span>' : ''}
        ${typeof film.rating === 'number' ? `<span class="badge rating">${film.rating}★</span>` : ''}
      </div>
      <img class="poster" src="${film.poster || ''}" 
           alt="${echapperHtml(film.title)}" 
           onerror="this.src=''; this.closest('.posterWrap').classList.add('noimg')" />
    </div>
    <div class="meta">
      <h3 class="title">${echapperHtml(film.title)}</h3>
      <p class="sub">${film.year} · ${film.rating ?? '-'} /10</p>
      <div class="actions">
        <button class="fav ${film.fav ? 'active' : ''}" data-film-id="${film.id}">
          ${film.fav ? '★ Favori' : '☆ Favori'}
        </button>
        <button class="wish ${film.wish ? 'active' : ''}" data-film-id="${film.id}">
          ${film.wish ? '👁 Envie ✓' : '👁 Envie'}
        </button>
        <button class="del" data-film-id="${film.id}">Supprimer</button>
      </div>
    </div>
  `;
  listeListe.appendChild(carte);
});
```

**💡 Explication :**
- **`createElement('article')`** : Crée un élément HTML en mémoire
- **`dataset.idx`** : Équivaut à l'attribut `data-idx` en HTML
- **Template literals** `` `...` `` : Permet d'insérer du JavaScript dans du HTML
- **Ternaire** `condition ? siVrai : siFaux` : 
  - `${film.fav ? '❤' : ''}` → Affiche ❤ seulement si favori
- **Nullish coalescing** `??` : 
  - `${film.rating ?? '-'}` → Affiche `-` si rating est `null` ou `undefined`
- **`onerror`** : Handler si l'image ne charge pas
  - `this.src = ''` : Vide la source
  - `closest('.posterWrap')` : Trouve le parent avec cette classe
  - `classList.add('noimg')` : Ajoute une classe pour styliser le placeholder
- **`echapperHtml()`** : Sécurité XSS (voir section suivante)

#### d) Statistiques

```javascript
const total = films.length;
const nombreFavoris = films.filter(f => f.fav).length;
const nombreEnvie = films.filter(f => f.wish).length;
const nombreNotes = films.filter(f => typeof f.rating === 'number').length;
if (statistiques) 
  statistiques.textContent = `Total: ${total} · Favoris: ${nombreFavoris} · Envie: ${nombreEnvie} · Notés: ${nombreNotes}`;
```

**💡 Explication :**
- **`.filter().length`** : Pattern pour compter les éléments qui matchent une condition
- **`typeof film.rating === 'number'`** : Vérifie le type exact
  - Exclut `undefined`, `null`, `string`, etc.
- **Guard** `if (statistiques)` : Vérifie que l'élément existe avant de le modifier

---

### 5️⃣ Sécurité XSS (ligne 85)

```javascript
function echapperHtml(texte = '') { 
  return String(texte).replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":"&#39;"
  })[c]); 
}
```

**💡 Explication :**
- **XSS** : Cross-Site Scripting - injection de code malveillant
- **Regex** `/[&<>"']/g` :
  - `[]` : Character class - matche un de ces caractères
  - `g` : Global flag - remplace toutes les occurrences
- **Fonction de remplacement** : 
  - `c` : Caractère matché
  - `{...}[c]` : Lookup dans un objet
- **Entités HTML** : `<` → `&lt;` empêche l'interprétation comme balise HTML

**Exemple :**
```javascript
echapperHtml("<script>alert('XSS')</script>")
// Retourne: "&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;"
// Sera affiché comme texte, pas exécuté
```

---

### 6️⃣ Page d'accueil - Dernières sorties (lignes 87-145)

```javascript
const afficherAccueil = async () => {
  if (!derniersFilms) return;
  
  accueilVide.textContent = 'Chargement des dernières sorties...';
  accueilVide.style.display = 'block';
  derniersFilms.innerHTML = '';
```

**💡 Explication :**
- **`async`** : Déclare une fonction asynchrone (peut utiliser `await`)
- **Early return** : Si l'élément n'existe pas, sort immédiatement
- **UI feedback** : Affiche un message de chargement

#### Requêtes parallèles

```javascript
const recherches = [
  `https://www.omdbapi.com/?apikey=${CLE_OMDB}&s=2025&type=movie&y=${anneeActuelle}`,
  `https://www.omdbapi.com/?apikey=${CLE_OMDB}&s=action&type=movie&y=${anneeActuelle}`,
  `https://www.omdbapi.com/?apikey=${CLE_OMDB}&s=adventure&type=movie&y=${anneeActuelle}`,
  `https://www.omdbapi.com/?apikey=${CLE_OMDB}&s=drama&type=movie&y=${anneeActuelle}`
];

const resultats = await Promise.all(
  recherches.map(url => fetch(url).then(r => r.json()))
);
```

**💡 Explication :**
- **4 URLs différentes** : Cherche des films 2025 dans différents genres
- **`Promise.all()`** : Lance toutes les requêtes EN PARALLÈLE
  - Attend que toutes soient terminées
  - Plus rapide que 4 requêtes séquentielles (4x plus rapide !)
- **`.map()`** : Transforme chaque URL en une promesse
- **`fetch()`** : API moderne pour les requêtes HTTP
- **`.then(r => r.json())`** : Parse la réponse en JSON

**Schéma temporel :**
```
Séquentiel (lent) :     [Req1] → [Req2] → [Req3] → [Req4]  = 4s
Parallèle (rapide) :    [Req1]
                        [Req2]  toutes en même temps       = 1s
                        [Req3]
                        [Req4]
```

#### Traitement des résultats

```javascript
const tousFilms = resultats
  .filter(data => data.Response === 'True' && data.Search)
  .flatMap(data => data.Search)
  .filter((film, index, self) => 
    index === self.findIndex(f => f.imdbID === film.imdbID)
  );
```

**💡 Explication :**
- **Chaînage de méthodes** : Pattern fonctionnel élégant
- **Premier `.filter()`** : Garde seulement les réponses réussies
  - `data.Response === 'True'` : L'API retourne une string "True"
  - `&& data.Search` : Vérifie que le tableau existe
- **`.flatMap()`** : Fusionne tous les tableaux en un seul
  - `[films1] + [films2] + [films3] + [films4]` → `[tous les films]`
- **Deuxième `.filter()`** : DÉDOUBLONNAGE
  - `self.findIndex()` : Trouve la première occurrence de ce film
  - `index === ...` : Garde seulement si c'est la première fois qu'on voit cet ID

**Exemple de dédoublonnage :**
```javascript
const films = [
  {imdbID: 'tt123'},
  {imdbID: 'tt456'},
  {imdbID: 'tt123'}, // doublon !
];
// Après filter : [{imdbID: 'tt123'}, {imdbID: 'tt456'}]
```

#### Affichage des cartes

```javascript
tousFilms.slice(0, 4).forEach((film) => {
  const carte = document.createElement('article');
  carte.className = 'card';
  carte.innerHTML = `...`;
  
  carte.addEventListener('click', async () => {
    const details = await obtenirDetailsFilm(film.imdbID);
    if (details) ouvrirModal(details, false);
  });
  
  derniersFilms.appendChild(carte);
});
```

**💡 Explication :**
- **`.slice(0, 4)`** : Prend seulement les 4 premiers films
- **Event listener async** : Peut utiliser `await` dans le handler
- **`ouvrirModal(details, false)`** : 
  - `false` → Mode lecture seule
  - Ne pas ajouter automatiquement à la collection

---

### 7️⃣ Proxy & Réactivité (lignes 147-160)

```javascript
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
```

**💡 Explication - CONCEPT CLÉ :**

Le **Proxy** est un pattern avancé qui intercepte les opérations sur un objet.

**Sans Proxy (approche manuelle) :**
```javascript
films[0] = nouveauFilm;
sauvegarder();    // ❌ Oubli fréquent !
afficher();       // ❌ Oubli fréquent !
```

**Avec Proxy (approche réactive) :**
```javascript
films[0] = nouveauFilm;  // ✅ Sauvegarde et affichage automatiques !
```

**Comment ça marche :**
1. Chaque fois qu'on modifie `films` : `films[i] = ...`, `films.push()`, etc.
2. Le Proxy intercepte avec la méthode `set()`
3. Il exécute automatiquement :
   - Modification de la donnée
   - Sauvegarde localStorage
   - Re-rendu du DOM
4. Retourne `true` (obligatoire pour confirmer l'opération)

**Flux de données :**
```
films[0] = newFilm
    ↓
Proxy.set() intercepte
    ↓
cible[propriete] = valeur  (modification réelle)
    ↓
sauvegarder()             (persistence)
    ↓
afficher()                (UI update)
```

---

### 8️⃣ CRUD - Opérations sur les films (lignes 162-174)

#### Create

```javascript
function ajouterFilm(film) { 
  films.push(film); 
}
```

**💡 Explication :**
- `push()` déclenche le Proxy
- Automatiquement sauvegardé et affiché

#### Update

```javascript
function modifierFilm(index, film) { 
  films[index] = Object.assign(films[index] || {}, film); 
}
```

**💡 Explication :**
- **`Object.assign(target, source)`** : Fusionne les objets
  - `films[index] || {}` : Fallback si undefined
  - Copie les propriétés de `film` dans `films[index]`
- **Fusion** permet de modifier seulement certains champs :
  ```javascript
  // Film actuel : { id: 1, title: "Inception", fav: false }
  modifierFilm(0, { fav: true });
  // Résultat : { id: 1, title: "Inception", fav: true }
  ```

#### Delete

```javascript
function supprimerFilm(index) {
  const carte = listeListe.querySelector(`article[data-idx="${index}"]`);
  if (carte) carte.classList.add('removing');
  setTimeout(() => {
    films.splice(index, 1);
  }, 250);
}
```

**💡 Explication :**
- **Animation avant suppression** : UX agréable
- **`.querySelector()`** avec template literal : Trouve la carte exacte
- **`classList.add('removing')`** : Déclenche l'animation CSS
- **`setTimeout(250ms)`** : Attend la fin de l'animation
- **`.splice(index, 1)`** : Supprime 1 élément à la position `index`

---

### 9️⃣ Thème Dark/Light (lignes 176-187)

```javascript
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
```

**💡 Explication :**
- **`document.documentElement`** : Élément `<html>`
- **`data-theme`** : Attribut custom HTML5
- **CSS correspondant** :
  ```css
  :root { --bg: white; }
  :root[data-theme="dark"] { --bg: black; }
  ```
- **Toggle** : Inverse le thème à chaque clic
- **Persistence** : Restaure le thème au chargement

---

### 🔟 Event Delegation (lignes 192-211)

```javascript
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
```

**💡 Explication - PATTERN PERFORMANCE :**

**Approche naïve (❌ mauvaise) :**
```javascript
// Attacher un listener à CHAQUE bouton
films.forEach(film => {
  const btn = document.querySelector(`#btn-${film.id}`);
  btn.addEventListener('click', () => {...});
});
// Problème : 100 films = 300 listeners !
```

**Event Delegation (✅ meilleure) :**
```javascript
// UN SEUL listener sur le conteneur parent
listeListe.addEventListener('click', (e) => {...});
// Avantages :
// - 1 listener au lieu de 300
// - Fonctionne avec les éléments ajoutés dynamiquement
// - Moins de mémoire utilisée
```

**Mécanisme :**
1. Clic sur un bouton
2. L'événement "remonte" (bubbling) vers les parents
3. `listeListe` intercepte
4. `e.target` : Élément cliqué
5. `.closest('button')` : Trouve le bouton parent (au cas où on clique sur le texte)
6. Identifie l'action via `classList.contains()`
7. **`e.stopPropagation()`** : Empêche l'événement de remonter plus haut
   - Évite d'ouvrir la modale quand on clique sur un bouton

---

### 1️⃣1️⃣ API OMDb - Recherche (lignes 213-252)

```javascript
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
      carte.innerHTML = `...`;
      
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
```

**💡 Explication :**
- **`try/catch`** : Gestion des erreurs réseau
- **`encodeURIComponent(requete)`** : Encode les caractères spéciaux
  - `"Star Wars"` → `"Star%20Wars"`
  - Évite les erreurs d'URL
- **URL API** :
  - `apikey` : Clé d'authentification
  - `s` : Search query (mot-clé)
  - `type=movie` : Seulement les films (pas séries)
- **`await fetch()`** : Attend la réponse HTTP
- **`await .json()`** : Parse le JSON
- **`donnees?.Error`** : Optional chaining - accède à `Error` seulement si `donnees` existe

#### Récupération des détails complets

```javascript
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
```

**💡 Explication :**
- **`i=${imdbId}`** : Recherche par ID (plus précis)
- **`plot=full`** : Récupère le synopsis complet (pas juste un résumé)
- **Normalisation** : Transforme les données API en format interne
  - `donnees.Title` (API) → `title` (app)
  - `'N/A'` (API) → `''` (app)
- **Return `null`** en cas d'erreur : Pattern défensif

---

### 1️⃣2️⃣ Toggle Favori/Wishlist (lignes 306-321)

```javascript
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
```

**💡 Explication - IMMUTABILITÉ :**

**❌ Approche mutable (ne marche PAS avec Proxy) :**
```javascript
films[index].fav = !films[index].fav;  // Modifie l'objet directement
// Problème : Le Proxy intercepte SET sur le TABLEAU, pas sur l'OBJET
// → Pas de sauvegarde ni re-rendu !
```

**✅ Approche immutable (marche avec Proxy) :**
```javascript
films[index] = Object.assign({}, actuel, { fav: !actuel.fav });
// Crée un NOUVEL objet → Proxy détecte le SET → Sauvegarde + rendu !
```

**`Object.assign()` en détail :**
```javascript
const actuel = { id: 1, title: "Inception", fav: false };
const modifie = Object.assign({}, actuel, { fav: true, updatedAt: 123 });

// Résultat :
// modifie = { id: 1, title: "Inception", fav: true, updatedAt: 123 }
// actuel reste inchangé (immutabilité)
```

- **`!actuel.fav`** : Inverse booléen (`true` → `false`, `false` → `true`)
- **`Date.now()`** : Timestamp en millisecondes (pour tracking)

---

### 1️⃣3️⃣ Filtres (lignes 323-330)

```javascript
function activerFiltre(bouton) {
  [filtreTous, filtreFavoris, filtreNotes, filtreEnvie].forEach(b => 
    b && b.classList.remove('active')
  );
  bouton.classList.add('active');
  afficher();
}

filtreEnvie && filtreEnvie.addEventListener('click', () => activerFiltre(filtreEnvie));
filtreTous && filtreTous.addEventListener('click', () => activerFiltre(filtreTous));
filtreFavoris && filtreFavoris.addEventListener('click', () => activerFiltre(filtreFavoris));
filtreNotes && filtreNotes.addEventListener('click', () => activerFiltre(filtreNotes));
```

**💡 Explication :**
- **Tableau de boutons** : Permet de les itérer facilement
- **`b && ...`** : Guard - exécute seulement si `b` existe
- **Désactive tous** puis **active un seul** : Pattern "radio buttons"
- **`afficher()`** : Re-rend avec le nouveau filtre actif

---

### 1️⃣4️⃣ Modale (lignes 357-443)

#### Structure des éléments

```javascript
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
```

**💡 Explication :**
- **`let idActuel`** : Variable globale pour tracker le film actuellement affiché
- Utilisée par les handlers d'événements (étoiles, fav, wish)

#### Helpers

```javascript
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
```

**💡 Explication :**
- **`findIndex()`** : Retourne l'index ou `-1` si non trouvé
- **Pattern "upsert"** : Update or Insert
  - Si existe : met à jour
  - Sinon : crée nouveau
- **Normalisation** : S'assure que tous les champs existent
- **`??`** (nullish coalescing) : Valeur par défaut seulement si `null`/`undefined`
  - Différent de `||` qui réagit aussi à `false`, `0`, `""`

#### Système de notation

```javascript
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
```

**💡 Explication :**
- **Validation** : Force la valeur entre 0 et 10
  - `Math.max(0, ...)` : Minimum 0
  - `Math.min(10, ...)` : Maximum 10
  - `Number(valeur) || 0` : Convertit en nombre ou 0 si invalide
- **Boucle** : Crée 10 étoiles
- **Classe conditionnelle** : `active` si l'étoile ≤ note
- **`dataset.value`** : Stocke la valeur pour le clic

#### Ouverture modale

```javascript
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
  if (film.genre) metaHTML += `<span><strong>Genre:</strong> ${echapperHtml(film.genre)}</span>`;
  if (film.runtime) metaHTML += `<span><strong>Durée:</strong> ${echapperHtml(film.runtime)}</span>`;
  metaDonnees.innerHTML = metaHTML;
  
  descriptionFilm.textContent = film.plot || '';
  
  afficherEtoiles(film.rating || 0);
  boutonEnvieModal.classList.toggle('active', !!film.wish);
  boutonFavoriModal.classList.toggle('active', !!film.fav);
  modale.classList.remove('hidden');
  modale.setAttribute('aria-hidden', 'false');
}
```

**💡 Explication :**
- **Paramètre optionnel** `ajouterACollection = true` :
  - **true** (recherche) : Ajoute le film à la collection
  - **false** (accueil) : Mode lecture seule
- **Logique conditionnelle** :
  - Si ajout : upsert dans la collection
  - Sinon : affiche les infos ou film existant
- **`onerror`** : Handler si image ne charge pas
- **Construction HTML incrémentale** : Ajoute seulement les champs présents
- **`!!film.wish`** : Double négation → convertit en booléen
  - `undefined` → `false`
  - `"string"` → `true`
- **`classList.toggle(class, condition)`** : Ajoute si true, retire si false
- **Accessibilité** : `aria-hidden="false"` pour les lecteurs d'écran

#### Fermeture modale

```javascript
function fermerModal() {
  modale.classList.add('hidden');
  modale.setAttribute('aria-hidden', 'true');
  idActuel = null;
}

modale.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) fermerModal();
});

boutonFermerModale && boutonFermerModale.addEventListener('click', fermerModal);
```

**💡 Explication :**
- **Reset** `idActuel = null` : Nettoie l'état
- **Clic sur overlay** : Ferme si clic sur élément avec `data-close`
- **`.matches()`** : Vérifie si l'élément matche le sélecteur

#### Notation interactive

```javascript
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
```

**💡 Explication :**
- **Type checking** : `instanceof HTMLElement` vérifie que c'est un élément DOM
- **Guards multiples** : Série de vérifications
- **`dataset.value`** : Récupère la valeur 1-10
- **Mise à jour** : Modifie le film + réaffiche les étoiles

#### Actions modale (Fav/Wish)

```javascript
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
```

**💡 Explication :**
- **Fonction générique** : Un seul code pour fav et wish
- **`type`** : String `'wish'` ou `'fav'`
- **Computed property** `[type]` : Utilise la variable comme nom de propriété
  ```javascript
  { [type]: true }  // si type="fav" → { fav: true }
  ```
- **Si film pas dans collection** : Le crée avec les données de la modale
- **Sinon** : Toggle le champ
- **Optional chaining** `?.` : N'attache l'événement que si le bouton existe

---

### 1️⃣5️⃣ Navigation (lignes 451-465)

```javascript
function changerPage(pageActive) {
  const pages = { 
    accueil: [navAccueil, sectionAccueil], 
    recherche: [navRecherche, sectionRecherche], 
    collection: [navCollection, sectionCollection] 
  };
  
  Object.entries(pages).forEach(([nom, [nav, section]]) => {
    const estActif = nom === pageActive;
    nav?.classList.toggle('active', estActif);
    if (section) section.style.display = estActif ? 'block' : 'none';
  });
}

navAccueil?.addEventListener('click', () => changerPage('accueil'));
navRecherche?.addEventListener('click', () => changerPage('recherche'));
navCollection?.addEventListener('click', () => changerPage('collection'));
```

**💡 Explication :**
- **Objet de configuration** : Map nom → [nav, section]
- **`Object.entries()`** : Transforme objet en tableau de paires
  ```javascript
  { a: 1, b: 2 } → [['a', 1], ['b', 2]]
  ```
- **Destructuring** `[nom, [nav, section]]` : Extrait les valeurs
- **`.toggle(class, boolean)` avancé** :
  - Si `estActif === true` : ajoute la classe
  - Si `estActif === false` : retire la classe
- **Affichage conditionnel** : `display: block` pour la page active, `none` pour les autres

---

## 🎓 Concepts avancés utilisés

### 1. **Proxy Pattern**
- Intercepte les modifications pour automatiser sauvegarde + rendu
- Alternative moderne aux Observables/Watchers

### 2. **Event Delegation**
- Un seul listener pour tous les boutons
- Optimisation mémoire et performance

### 3. **Async/Await**
- Code asynchrone lisible (vs callbacks hell)
- Gestion d'erreurs avec try/catch

### 4. **Promise.all()**
- Requêtes HTTP parallèles
- 4x plus rapide que séquentiel

### 5. **Template Literals**
- HTML dynamique élégant
- Interpolation de variables

### 6. **Destructuring**
- Extraction de valeurs concise
- Arrays et objets

### 7. **Ternaires & Short-circuit**
- Conditions compactes
- `a && b`, `a || b`, `a ?? b`

### 8. **Immutable Updates**
- Pattern fonctionnel
- Nécessaire pour trigger Proxy

### 9. **Optional Chaining**
- `?.` évite les erreurs null
- Code défensif

### 10. **Computed Properties**
- `[variable]` comme clé d'objet
- Rend le code générique

---

## 🌐 API et données

### OMDb API
- **Base URL:** `https://www.omdbapi.com/`
- **Authentification:** API key dans l'URL
- **Rate limit:** 1000 requêtes/jour (gratuit)

### Endpoints utilisés

#### 1. Recherche par mot-clé
```
GET /?apikey=XXX&s=inception&type=movie
```
**Réponse:**
```json
{
  "Search": [
    {
      "Title": "Inception",
      "Year": "2010",
      "imdbID": "tt1375666",
      "Poster": "https://..."
    }
  ],
  "Response": "True"
}
```

#### 2. Détails d'un film
```
GET /?apikey=XXX&i=tt1375666&plot=full
```
**Réponse:**
```json
{
  "Title": "Inception",
  "Year": "2010",
  "Genre": "Action, Sci-Fi",
  "Runtime": "148 min",
  "Plot": "A thief who steals...",
  "Poster": "https://...",
  "imdbID": "tt1375666",
  "Response": "True"
}
```

### Structure d'un film dans l'app

```javascript
{
  id: "tt1375666",          // IMDb ID (unique)
  title: "Inception",       // Titre
  year: "2010",            // Année
  poster: "https://...",   // URL poster
  plot: "...",             // Synopsis
  genre: "Action, Sci-Fi", // Genres
  runtime: "148 min",      // Durée
  rating: 8,               // Note /10 (optionnel)
  fav: true,               // Favori (booléen)
  wish: false,             // Envie de voir (booléen)
  createdAt: 1234567890,   // Timestamp ajout
  updatedAt: 1234567890    // Timestamp modif
}
```

### localStorage

**Clés:**
- `movieTracker.movies_v1` : Tableau de films (JSON)
- `movieTracker.theme_v1` : Thème (`"light"` ou `"dark"`)

**Exemple de données:**
```json
{
  "movieTracker.movies_v1": "[{\"id\":\"tt1375666\",\"title\":\"Inception\",\"fav\":true}]",
  "movieTracker.theme_v1": "dark"
}
```

---

## 📊 Statistiques du code

- **Lignes de code:** 465
- **Fonctions:** 18
- **Event listeners:** 15
- **Requêtes API:** 5 (4 parallèles accueil + recherche)
- **Éléments DOM:** 23
- **Concepts avancés:** 10+

---

## 🎯 Points forts du projet

✅ **Vanilla JavaScript** - Pas de framework, démontre la maîtrise du langage  
✅ **Pattern Proxy** - Réactivité moderne et élégante  
✅ **Event Delegation** - Performance optimisée  
✅ **Async/Await** - Code asynchrone propre  
✅ **Immutabilité** - Pattern fonctionnel  
✅ **Sécurité XSS** - Protection contre injections  
✅ **Accessibilité** - Attributs ARIA  
✅ **UX** - Animations, feedback utilisateur  
✅ **Persistence** - localStorage pour sauvegardes  
✅ **Responsive** - Adapté mobile/desktop  

---

## 📚 Ressources complémentaires

- [MDN - Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN - Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- [OMDb API Documentation](http://www.omdbapi.com/)
- [Event Delegation](https://javascript.info/event-delegation)

---

**Fin de la documentation**
