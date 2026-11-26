# O&H Pro Clim — site + espace admin

## Pourquoi les avis ne s'affichaient pas ?
Avant, les avis étaient enregistrés dans le `localStorage` du navigateur du visiteur : lui seul les voyait.
Maintenant ils sont enregistrés dans une base **Firebase Firestore** (gratuite) partagée par tous les visiteurs.

## Installation (déjà faite pour ce projet : config.js est rempli)
1. Allez sur https://console.firebase.google.com → **Ajouter un projet** (ex : `ohproclim`). Google Analytics : non.
2. **Build → Firestore Database → Créer** (mode production, région `eur3` ou `europe-west`).
3. **Build → Authentication → Commencer → Email/Mot de passe → Activer.**
   Onglet *Users* → **Add user** : votre email + un mot de passe fort (c'est votre accès admin).
4. **Firestore → Règles** : copiez le contenu de `firestore.rules` (remplacez l'email par celui de l'étape 3) → **Publier**.
5. **Paramètres du projet (⚙️) → Vos applications → `</>` Web** → enregistrez l'app → copiez l'objet `firebaseConfig`
   et collez ses valeurs dans **`config.js`**.
6. **Authentication → Paramètres → Domaines autorisés** : ajoutez `ohproclim.com` (et `www.ohproclim.com`).
7. Envoyez tous les fichiers sur GitHub (comme avant). C'est en ligne.

## Utiliser l'admin
Ouvrez **https://ohproclim.com/admin/** → connectez-vous.
- **Réalisations** : ajouter/modifier/supprimer/réordonner. La 1ère fois, cliquez « Importer les réalisations existantes ».
- **Avis** : masquer / supprimer / ajouter.
- **Textes & contact** : titre, descriptions, chiffres, téléphones, WhatsApp, email, réseaux.
- **Services**, **FAQ & zones**, **Réglages** (bandeau promo, couleur, sauvegarde).
Les changements apparaissent sur le site immédiatement (sans republier).

## Sans Firebase (mode démo)
Si `config.js` est vide, tout marche mais seulement sur le même navigateur (utile pour tester).

## Fichiers
`index.html` site · `admin/index.html` admin · `store.js` données · `site.js` applique les modifications ·
`enhance.css/js` effets visuels · `defaults.js` valeurs d'origine · `firestore.rules` sécurité.

## Langues (FR / EN / AR)
Le sélecteur **FR · EN · ع** est en haut du site (et dans le menu mobile). L'arabe passe automatiquement en lecture de droite à gauche.
Les traductions sont dans `i18n.js` (clé = texte français). Un texte **modifié dans l'admin** reste dans la langue où vous l'avez écrit
(il n'a pas de traduction automatique) ; ajoutez-le dans `i18n.js` si vous voulez le traduire.
Lien direct : `ohproclim.com/?lang=ar` · `?lang=en`.
