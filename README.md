# Krosmodex — classeur de cartes Wakfu TCG / Ankama / Upper Deck

Web-app pour iPhone (PWA) : un classeur de collection, dans l'esprit des « dex » de collection.
Pas d'App Store, pas de Mac : elle s'installe depuis Safari et fonctionne **hors ligne**.

## Fonctions

- **10 extensions Wakfu TCG préchargées** (1 585 emplacements numérotés) : Incarnam (320), Astrub (162), Amakna (162),
  Bonta & Brâkmar (320), Pandala (162), Otomaï (162), Le Chaos d'Ogrest (162), Dofus Collection (100),
  L'Île des Wabbits (30) et Promos & tournois (taille modifiable).
- **Collections personnalisées** pour tout le reste (Dofus, Krosmaster, autres cartes Upper Deck…) : nom, gamme, nombre de cartes.
- **Vue classeur** (pages de 9 pochettes, balayage pour tourner les pages) ou **vue grille**.
  Cartes possédées en couleur, manquantes en pointillés.
- **Fiche carte** : nom, exemplaires, brillantes ✦, rareté, état, note, « je la recherche ★ »
  et **photo prise avec l'appareil photo** (elle remplace le dos de la pochette).
- **Ajout rapide ⚡ +1** : un toucher = +1 exemplaire (avec « Annuler »), appui long = fiche.
- Filtres possédées / manquantes / doubles / recherchées, recherche par numéro ou par nom (dans une extension ou partout).
- **Import de la liste des noms** par copier-coller (`numéro ; nom ; rareté`).
- **Partage** de la liste des manquantes et des doubles (Messages, Discord…).
- **Sauvegarde / restauration** dans un fichier `.json` (photos comprises), via le menu Partager de l'iPhone.

Les noms des cartes ne sont pas fournis : aucune base ouverte n'existe pour Wakfu TCG
(le site communautaire WTCG Return bloque l'accès automatisé). Les emplacements sont numérotés comme
sur les cartes (`042/162`) ; on remplit les noms au fil de l'eau ou en collant une liste.

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
