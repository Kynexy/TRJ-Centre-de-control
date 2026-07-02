# Planning Storage V1

Le module Planning utilise une couche de donnees dediee : `KynexyPlanningDB`.

L'interface ne cree, ne lit, ne modifie et ne supprime plus les rendez-vous directement. Elle passe par cette API :

- `createAppointment`
- `getAppointment`
- `listAppointments`
- `updateAppointment`
- `deleteAppointment`
- `listContextEvents`

## Pourquoi IndexedDB

IndexedDB est le moteur prioritaire pour cette V1 terrain :

- les rendez-vous restent disponibles apres fermeture de l'application ;
- plusieurs milliers d'enregistrements peuvent etre stockes sans transformer le navigateur en goulot ;
- les index par date permettent un affichage rapide du mois, de la semaine et du jour ;
- aucune connexion serveur n'est necessaire pour commencer a utiliser le Planning ;
- la structure reste compatible avec une future synchronisation Supabase/PostgreSQL.

Si IndexedDB ne s'ouvre pas dans un environnement particulier, la meme API bascule vers un fallback persistant `localStorage`. Ce fallback sert a eviter un blocage total de l'application, mais la cible produit reste IndexedDB, puis Supabase/PostgreSQL pour la synchronisation.

## Limites assumees

Cette V1 n'est pas encore une synchronisation multi-appareils.

Les donnees sont locales au navigateur utilise. C'est volontaire pour rendre le Planning utilisable immediatement, sans introduire un backend incomplet ou fragile. La prochaine evolution logique sera une synchronisation entre IndexedDB et le noyau Kynexy Core lorsque l'authentification et Supabase seront en place.

## Trajectoire

V1 :

- API `KynexyPlanningDB` isolee dans `planning-db.js`.
- IndexedDB locale prioritaire.
- Index par date, date+heure et categorie.
- Fallback localStorage si IndexedDB est indisponible.
- Journal `context_events` local pour chaque creation, modification et suppression.
- Exposition du contexte Planning au noyau KYNEXY via `window.AurelState.planning`.

V2 :

- synchronisation Supabase ;
- resolution des conflits ;
- sauvegarde multi-appareil ;
- alimentation de `context_events` dans Kynexy Core.

La regle reste la meme : le Planning possede ses faits metier, le noyau contexte conserve l'historique transversal, et KYNEXY interprete les donnees sans les posseder.
