# Landing page — 4 personnes · 1 livre · 10 jours · 1 dîner

Landing page statique, sans framework, composée de :
- `index.html`
- `styles.css`
- `app.js`

## Lancer localement

Aucun build n'est nécessaire. Ouvre `index.html` dans un navigateur.

Pour éviter les restrictions du navigateur liées aux ressources externes, tu peux aussi lancer un petit serveur statique :

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Personnalisation

- Les questions et réponses sont dans `app.js`.
- Les images utilisent actuellement des URLs Unsplash pour le prototype.
- Le formulaire affiche une confirmation côté client. Branche ton endpoint NestJS dans le handler `signupForm` de `app.js`.
- Les polices sont chargées depuis Google Fonts.

## Important pour la production

Pour une landing commerciale, vérifie les droits/licences des photos choisies et remplace les images de prototype par des assets dont tu as confirmé les droits d'utilisation.
