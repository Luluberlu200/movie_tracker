export function initialiserCompteur(element) {
  let compteur = 0;
  const Compteur = (valeur) => {
    compteur = valeur;
    element.innerHTML = `compteur: ${compteur}`;
  };
  element.addEventListener('click', () => Compteur(compteur + 1));
  Compteur(0);
}
