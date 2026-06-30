# Configuration Aurel Cockpit Scroll V1

Ce document explique comment connecter les sources externes d'Aurel.

Toutes les valeurs se renseignent dans `config.js`, dans l'objet :

```js
window.AUREL_CONFIG = {
    // configuration ici
};
```

Ne modifie pas les modules pour connecter une source. Modifie uniquement `config.js`.

## Google Agenda

Champ a renseigner :

```js
agenda: {
    googleCalendarEmbedUrl: ""
}
```

Etapes :

1. Ouvrir Google Calendar.
2. Aller dans les parametres du calendrier a afficher.
3. Chercher la section d'integration du calendrier.
4. Copier l'URL de l'iframe Google Calendar.
5. Coller cette URL dans `googleCalendarEmbedUrl`.

Exemple :

```js
agenda: {
    googleCalendarEmbedUrl: "https://calendar.google.com/calendar/embed?src=..."
}
```

Important : si le calendrier est prive, il faut autoriser son partage ou utiliser plus tard une integration OAuth.

## YouTube

Champ a renseigner :

```js
api: {
    youtubeApiKey: ""
}
```

Etapes :

1. Ouvrir Google Cloud Console.
2. Creer ou selectionner un projet.
3. Activer YouTube Data API v3.
4. Creer une cle API.
5. Coller la cle dans `youtubeApiKey`.

Exemple :

```js
api: {
    youtubeApiKey: "AIza..."
}
```

Sans cette cle, Aurel affiche un lien vers la recherche YouTube officielle et n'invente aucun resultat.

## Messenger TRJ

Champ a renseigner :

```js
messenger: {
    provider: "Messenger TRJ",
    url: ""
}
```

Etapes :

1. Recuperer le lien officiel Messenger, Facebook Page Inbox ou Meta Business Suite.
2. Coller ce lien dans `messenger.url`.

Exemple :

```js
messenger: {
    provider: "Messenger TRJ",
    url: "https://business.facebook.com/latest/inbox/..."
}
```

Important : Meta ne fournit pas une vraie inbox Messenger complete en iframe simple. Pour une integration profonde, il faudra une integration Meta Business cote serveur.

## Kynexy / Prospects

Champ a renseigner :

```js
prospects: {
    provider: "Kynexy",
    url: ""
}
```

Etapes :

1. Recuperer l'URL officielle Kynexy des prospects.
2. Si Kynexy fournit un iframe ou un embed, utiliser cette URL.
3. Sinon, utiliser le lien direct vers l'application Kynexy.
4. Coller l'URL dans `prospects.url`.

Exemple :

```js
prospects: {
    provider: "Kynexy",
    url: "https://app.kynexy.example/prospects"
}
```

## Photo TRJ

Champs a renseigner :

```js
photo: {
    imageUrl: "",
    linkUrl: ""
}
```

Etapes :

1. Choisir une source officielle : image publique, dossier publie, site TRJ, reseau social ou flux media.
2. Copier l'URL directe de l'image dans `imageUrl`.
3. Optionnel : copier l'URL de la publication ou du dossier dans `linkUrl`.

Exemple :

```js
photo: {
    imageUrl: "https://example.com/photo-trj.jpg",
    linkUrl: "https://example.com/album-trj"
}
```

Sans `imageUrl`, Aurel indique clairement que la source photo reste a connecter.

## Actualites

Champs configurables :

```js
news: {
    endpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
    query: "Tahiti OR Polynesie",
    maxRecords: 3,
    fallbackUrl: "https://news.google.com/search?q=Tahiti%20Polynesie&hl=fr&gl=FR&ceid=FR%3Afr"
}
```

Etapes :

1. Garder GDELT si la source automatique suffit.
2. Modifier `query` pour cibler d'autres actualites.
3. Modifier `fallbackUrl` pour pointer vers une source fiable : Tahiti Infos, TNTV, Polynesie la 1ere, Google News, etc.

Si la source automatique est bloquee, Aurel affiche le lien direct de secours.

## Circulation

Configuration actuelle :

```js
traffic: {
    provider: "waze",
    embedUrl: "https://embed.waze.com/iframe?zoom=13&lat=-17.552554&lon=-149.607182&pin=1"
}
```

Waze est deja connecte. Pour changer la zone, modifier `lat`, `lon` et `zoom` dans l'URL.

## Verification Rapide

Apres modification de `config.js` :

1. Recharger Aurel.
2. Verifier que la carte concernee affiche la vraie source.
3. Verifier que le Rapport Aurel mentionne la source comme disponible.
4. Ouvrir la console navigateur et verifier qu'il n'y a pas d'erreur.

Une connexion correcte ne doit jamais afficher de fausse donnee.
