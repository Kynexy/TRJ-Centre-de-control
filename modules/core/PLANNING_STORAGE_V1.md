# Planning Storage V1

Le module Planning utilise IndexedDB comme base locale embarquee.

## Pourquoi IndexedDB

IndexedDB est le meilleur choix pour cette V1 terrain :

- les rendez-vous restent disponibles apres fermeture de l'application ;
- plusieurs milliers d'enregistrements peuvent etre stockes sans transformer le navigateur en goulot ;
- les index par date permettent un affichage rapide du mois, de la semaine et du jour ;
- aucune connexion serveur n'est necessaire pour commencer a utiliser le Planning ;
- la structure reste compatible avec une future synchronisation Supabase/PostgreSQL.

## Limites assumees

Cette V1 n'est pas encore une synchronisation multi-appareils.

Les donnees sont locales au navigateur utilise. C'est volontaire pour rendre le Planning utilisable immediatement, sans introduire un backend incomplet ou fragile. La prochaine evolution logique sera une synchronisation entre IndexedDB et le noyau Kynexy Core lorsque l'authentification et Supabase seront en place.

## Trajectoire

V1 :

- IndexedDB locale.
- Index par date, date+heure et categorie.
- Fallback localStorage si IndexedDB est indisponible.
- Exposition du contexte Planning a Aurel via `window.AurelState.planning`.

V2 :

- synchronisation Supabase ;
- resolution des conflits ;
- sauvegarde multi-appareil ;
- alimentation de `context_events` dans Kynexy Core.

La regle reste la meme : le Planning possede ses faits metier, le noyau contexte conserve l'historique transversal, et Aurel interprete les donnees sans les posseder.
