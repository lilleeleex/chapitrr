# chapitre. — landing v2

Deuxième version de la landing. La v1 reste intacte dans `../landing-book-match/`.

## Ce qui change par rapport à la v1

- **La formule est dans le hero** : « 4 personnes + 1 livre + 10 jours = 1 dîner », en très gros. En v1 elle était tout en bas.
- **Typo plus détendue** : Fraunces en version « soft » et « wonky » pour les titres, Caveat (manuscrite) pour les notes dans la marge, Figtree pour le texte. Playfair Display disparaît.
- **L'essentiel est surligné**, comme dans un livre annoté : surligneur jaune, cercles et flèches dessinés à la main, post-it « 1re édition · Auxerre 2026 ».
- **Un ordre plus logique** : hero → comment ça marche (4 étapes) → l'idée → quiz → inscription. Le quiz arrive après l'explication et mène à l'inscription.
- **Le bouton « Je veux participer » est partout** : barre du haut collante, hero, après les étapes, fin du quiz.
- **Des questions pensées pour le test** : chaque question du quiz et du formulaire alimente une couche du matching ou une hypothèse à valider (voir plus bas).

## Ce que mesurent les questions

| Question | Ce qu'elle mesure | À quoi ça sert |
|---|---|---|
| Quiz 1 — « À table, vous êtes plutôt du genre à… » | Le rôle dans un groupe : lancer les sujets, questionner, écouter, faire rire | Couche 2 (groupe) : éviter quatre bavards ou quatre silencieux à la même table |
| Quiz 2 — « Votre soirée idéale à quatre, c'est… » | L'ambiance recherchée : débat, confidences, fous rires, découverte | Couche 2 (groupe) : réunir des gens qui veulent la même soirée |
| Quiz 3 — « Avec les trois autres, vous aimeriez partager… » | Ce qui crée l'affinité (humour, valeurs, passions) ou l'envie d'être surpris | Couche 1 (A ↔ B) : sur quoi pondérer la compatibilité individuelle |
| Quiz 4 — « 100 pages en 10 jours, pour vous c'est… » | L'habitude de lecture et la perception de l'effort | Test du concept (la lecture fait-elle peur ?) et tables où tout le monde aura lu |
| Formulaire — « Qu'est-ce que vous venez chercher autour de la table ? » | Amour, amitié, les deux, ou juste une belle soirée | Test du positionnement (dating ou social ?) et dimension dating |
| Formulaire — « Vous êtes… » | Le genre | Ratio femmes / hommes réel des inscrits : la parité 2F/2H est-elle tenable ? |

## Lancer en local

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Envoi des candidatures (Formspree)

Le formulaire envoie vers Formspree : `https://formspree.io/f/xaeqwzon` (attribut `action` du `<form>`).

Le parcours après le formulaire se fait en trois temps :

1. **La candidature** part dès que le formulaire est validé (envoi `type = candidature`).
2. **La question sur le prix** s'affiche. La première édition est offerte, et on demande : « Si votre place à une prochaine édition était proposée à 19 € (livre, livraison et organisation compris, consommation non comprise), souhaiteriez-vous participer ? ». Un clic sur Oui, clairement / Peut-être / Non envoie la réponse (envoi `type = prix`).
3. **Le merci** s'affiche tout à la fin.

Chaque candidat qui répond au prix génère donc **deux envois** dans Formspree, reliés par le même `candidature_id` (et le même email). La candidature est enregistrée même si la personne ne répond pas au prix. Ces deux envois comptent tous les deux dans le quota mensuel de Formspree.

- **Avec JavaScript** : `app.js` envoie en arrière-plan (`fetch`, en-tête `Accept: application/json`). En cas d'échec, un message d'erreur s'affiche et on peut réessayer.
- **Sans JavaScript** : le formulaire part en HTML classique, avec les mêmes noms de champs (sans la question sur le prix), et Formspree affiche sa propre page de remerciement.
- **Anti-spam** : le champ caché `_gotcha`. Les robots le remplissent, et Formspree ignore alors l'envoi.

Tous les champs sont envoyés à plat (pas de JSON imbriqué) : chacun arrive séparément dans Formspree, ce qui permet de trier et d'exporter sans retraitement.

### Envoi « candidature »

| Champ | Valeurs | Remarque |
|---|---|---|
| `type` | `candidature` | |
| `candidature_id` | identifiant court, par exemple `mux42272-fa138` | Relie la candidature à la réponse prix |
| `prenom` | texte | |
| `email` | email | Formspree s'en sert comme adresse de réponse |
| `formule` | `diner`, `verre`, `les-deux` | Champ obligatoire : les tables se composent par formule |
| `intention` | `amour`, `amitie`, `ouvert` (les deux), `soiree` (juste une belle soirée) | |
| `genre` | `femme`, `homme`, `autre`, `non-precise` | |
| `quiz_statut` | `complet`, `partiel`, `non fait` | Toujours envoyé : donne le taux de complétion du quiz |
| `quiz_role` | `lance`, `questionne`, `ecoute`, `fait-rire` | Envoyé seulement si la question a été répondue |
| `quiz_ambiance` | `debat`, `confidences`, `fous-rires`, `decouverte` | Idem |
| `quiz_affinites` | `humour`, `valeurs`, `passions`, `surprise` | Idem |
| `quiz_lecture` | `formalite`, `faisable`, `petit-defi`, `vrai-defi` | Idem |
| `landing` | `v2` | Version de la landing (constante `LANDING_VERSION` dans `app.js`) |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | texte | Seulement si le lien visité contient ces paramètres, par exemple `?utm_source=instagram` |

Objet de l'email de notification : « Nouvelle inscription : <prénom> ».

### Envoi « prix »

| Champ | Valeurs | Remarque |
|---|---|---|
| `type` | `prix` | |
| `candidature_id` | le même que la candidature | |
| `prenom`, `email`, `formule` | ceux de la candidature | |
| `prix_teste` | `19` | Prix testé pour les éditions suivantes, depuis l'attribut `data-prix` du bloc `#pricePanel` dans `index.html`. Les envois plus anciens peuvent contenir `49`, ou `0` (période où l'on demandait seulement si payer sa consommation convenait) |
| `prix_reponse` | `oui` (Oui, clairement), `peut-etre`, `non` | |
| `landing` | `v2` | |

Objet de l'email de notification : « Prix 19 € (éditions suivantes) : <prénom> a répondu « … » » (texte de l'attribut `data-offre`).

Pour tester un autre prix : change `data-prix`, `data-offre` **et** le montant affiché dans la question (tout est dans `#pricePanel`).

Pour tester le parcours : lance le serveur local, remplis le formulaire, réponds à la question sur le prix, puis vérifie l'arrivée des deux envois dans Formspree.

## RGPD

La question sur l'attirance (« vous aimeriez rencontrer des hommes, des femmes… ») sera posée dans l'application, pas sur la landing. Combinée au genre, elle révèle l'orientation sexuelle, une donnée sensible (RGPD, article 9) : c'est dans l'app qu'il faudra un consentement explicite.

La landing collecte prénom, email, intention, genre et réponses au quiz. Il faut quand même une politique de confidentialité avant la mise en ligne.

## Photos du hero

Le hero est un slider de 3 polaroids qui illustrent les étapes 2 à 4 : le livre qui arrive, la lecture, le dîner. Il défile seul pendant deux tours, puis s'arrête. Il s'arrête aussi dès qu'on clique, et au survol. Il ne défile jamais si l'utilisateur a demandé moins d'animations.

1. Le livre arrive : Unsplash `photo-1776278726433-1cd96688ca7d` (un livre jaune vif sorti d'un colis en carton, mur bleu)
2. Dix jours pour le lire : Pexels `6496136` (une femme noire à lunettes, en pull rouge, sourit en lisant)
3. On passe à table : Pexels `6954047` (2 femmes et 2 hommes qui trinquent de part et d'autre de la table, à la bougie)

Ce sont des photos gratuites (Unsplash pour la première, Pexels pour les deux autres), chargées depuis leur CDN pour le prototype. Pour la production, télécharge-les (ou remplace-les par tes propres photos) et vérifie la licence et les droits à l'image des personnes visibles.
