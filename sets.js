// Catalogue des extensions préchargées.
// Source : liste des extensions Wakfu TCG (Wikipédia FR, recoupée avec WTCG Return).
// Les noms des cartes ne sont pas fournis : chaque emplacement est numéroté (001/320…),
// le nom, la rareté et la photo se remplissent depuis l'appli (ou par import d'une liste).
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
    block: 'Hors bloc', year: 2011, size: 30, publisher: 'Ankama', color: '#e07fa6' },
  { id: 'wtcg-promos', game: 'Wakfu TCG', name: 'Promos & tournois', en: 'Promos',
    block: 'Ankama Convention, tournois, Bazar de Ruel', year: 2010, size: 5, publisher: 'Ankama', color: '#7f8c9d',
    note: 'Le nombre de cartes promo est modifiable : ajoutez des emplacements au fur et à mesure.' },
];

window.RARITIES = ['Commune', 'Peu commune', 'Rare', 'Mythique', 'Légendaire', 'Promo'];
window.CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Bon état', 'Joué', 'Abîmé'];
