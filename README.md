# Krosmodex — classeur de cartes Wakfu TCG / Ankama / Upper Deck

Web-app pour iPhone (PWA) : un classeur de collection, dans l'esprit des « dex » de collection.
Pas d'App Store, pas de Mac : elle s'installe depuis Safari et fonctionne **hors ligne**.

## Fonctions

- **Toutes les cartes Wakfu TCG préremplies** (nom, type, rareté) : Incarnam (320), Astrub (162), Amakna (162),
  Bonta & Brâkmar (320), Pandala (162), Otomaï (162), Le Chaos d'Ogrest (162), Dofus Collection (100),
  Promos & tournois (198), Jetons & cartes spéciales (12), Cartes Kama (317). L'Île des Wabbits (30) est à remplir à la main.
- **Collections personnalisées** pour tout le reste (Dofus, Krosmaster, autres cartes Upper Deck…) : nom, gamme, nombre de cartes.
- **Vue classeur** (pages de 9 pochettes, balayage pour tourner les pages) ou **vue grille**.
  Cartes possédées en couleur, manquantes en pointillés.
- **Fiche carte** : nom, exemplaires, brillantes ✦, rareté, état, note, « je la recherche ★ »
  et **photo prise avec l'appareil photo** (elle remplace le dos de la pochette).
- **Ajout rapide ⚡ +1** : un toucher = +1 exemplaire (avec « Annuler »), appui long = fiche.
- Filtres possédées / manquantes / doubles / recherchées, recherche par numéro ou par nom (dans une extension ou partout).
- **Import de noms** par copier-coller (`numéro ; nom ; rareté`) pour les collections personnalisées.
- **Partage** de la liste des manquantes et des doubles (Messages, Discord…).
- **Sauvegarde / restauration** dans un fichier `.json` (photos comprises), via le menu Partager de l'iPhone.

Les noms, types et raretés viennent de l'encyclopédie Wakfu TCG de [Nokazu](https://nokazu.fr/encyclopedie/krosllection/wakfu_tcg)
(fichier `cards.js`, généré). Un nom peut être corrigé dans la fiche de la carte, sans toucher au catalogue.

## Installation sur iPhone

1. Ouvrir **https://ryossgh.github.io/Krosmodex/** dans Safari.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.

Les données restent sur le téléphone (IndexedDB). Faire une sauvegarde de temps en temps : Menu ⋯ → Sauvegarder.

## Publication

Le workflow `.github/workflows/pages.yml` publie l'appli sur GitHub Pages à chaque push sur `main`.
Une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Après une modification, changer `VERSION` dans `sw.js` pour que les iPhone récupèrent la nouvelle version.

Test en local : `python -m http.server` dans ce dossier, puis http://localhost:8000.

Aucune dépendance, aucune étape de construction : HTML, CSS et JavaScript seulement.
