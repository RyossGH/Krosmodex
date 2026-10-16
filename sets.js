// Catalogue des extensions préchargées.
// Source : liste des extensions Wakfu TCG (Wikipédia FR, recoupée avec WTCG Return).
// Les noms, types et raretés des cartes sont dans cards.js (CARD_DATA, même identifiant).
window.BUILTIN_SETS = [
  { id: 'wtcg-incarnam', game: 'Wakfu TCG', name: 'Incarnam', en: 'Incarnam',
    block: 'Bloc Incarnam', year: 2009, size: 320, publisher: 'Ankama / Upper Deck', color: '#5aa469' },
  { id: 'wtcg-astrub', game: 'Wakfu TCG', name: 'Astrub, La Menace Roublarde', en: 'Astrub: The Crafty Threat',
    block: 'Bloc Incarnam', year: 2010, size: 162, publisher: 'Ankama / Upper Deck', color: '#d9a441' },
  { id: 'wtcg-amakna', game: 'Wakfu TCG', name: 'Amakna, Les Lames Fatales', en: 'Amakna: The Fatal Blades',
    block: 'Bloc Incarnam', year: 2010, size: 162, publisher: 'Ankama', color: '#8a6bd1' },
  { id: 'wtcg-bonta-brakmar', game: 'Wakfu TCG', name: 'Bonta & Brâkmar', en: 'Bonta & Brakmar',
    block: 'Bloc Bonta & Brâkmar', year: 2010, size: 320, publisher: 'Ankama', color: '#c94f4f' },
  { id: 'wtcg-pandala', game: 'Wakfu TCG', name: 'Pandala, La Dernière Rasade', en: 'Pandala: The Last Round',
    block: 'Bloc Bonta & Brâkmar', year: 2011, size: 162, publisher: 'Ankama', color: '#4fa3c9' },
  { id: 'wtcg-otomai', game: 'Wakfu TCG', name: 'Otomaï, Poulpe Fiction', en: 'Otomai: Poulpe Fiction',
    block: 'Bloc Bonta & Brâkmar', year: 2011, size: 162, publisher: 'Ankama', color: '#3fae8f' },
  { id: 'wtcg-chaos-ogrest', game: 'Wakfu TCG', name: "Le Chaos d'Ogrest", en: "Ogrest's Chaos",
    block: 'Hors bloc (draft)', year: 2011, size: 162, publisher: 'Ankama', color: '#9c5a3c' },
  { id: 'wtcg-dofus-collection', game: 'Wakfu TCG', name: 'Dofus Collection', en: 'Dofus Collection',
    block: 'Réédition', year: 2011, size: 100, publisher: 'Ankama', color: '#c9a227' },
  { id: 'wtcg-ile-wabbits', game: 'Wakfu TCG', name: "L'Île des Wabbits", en: 'Wabbit Island',
    block: 'Hors bloc', year: 2011, size: 30, publisher: 'Ankama', color: '#e07fa6',
    note: "La liste des cartes de cette extension n'est pas disponible : les noms se remplissent à la main." },
  { id: 'wtcg-promos', game: 'Wakfu TCG', name: 'Promos & tournois', en: 'Promos',
    block: 'Avant-premières, tournois, conventions, Bazar de Ruel', year: 2009, size: 198, publisher: 'Ankama', color: '#7f8c9d' },
  { id: 'wtcg-jetons', game: 'Wakfu TCG', name: 'Jetons & cartes spéciales', en: 'Tokens',
    block: 'Jetons Incarnam, jetons de draft', year: 2009, size: 12, publisher: 'Ankama', color: '#5c7a99' },
  { id: 'wtcg-kama', game: 'Wakfu TCG', name: 'Cartes Kama (loterie)', en: 'Kama cards',
    block: 'Cartes à gratter des boosters', year: 2009, size: 317, publisher: 'Ankama', color: '#b8893a' },
];

window.RARITIES = ['Commune', 'Peu commune', 'Rare', 'Draconique', 'Promo'];
window.CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Bon état', 'Joué', 'Abîmé'];
