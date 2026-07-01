# Team Storage V1

Le module Equipe utilise une couche de donnees dediee : `KynexyTeamDB`.

L'interface ne cree, ne lit, ne modifie et ne supprime plus les salaries ou les journees de travail directement. Elle passe par cette API :

- `createMember`
- `getMember`
- `listMembers`
- `updateMember`
- `deleteMember`
- `upsertWorkEntry`
- `deleteWorkEntry`
- `listWorkEntries`
- `calculateSummary`
- `calculateAllSummaries`
- `listContextEvents`

## Donnees memorisees

La base locale conserve :

- les fiches salaries ;
- les heures travaillees par date ;
- les acomptes verses dans leur propre historique ;
- les notes de journee ;
- un journal `context_events` local.

## Calculs

Les calculs restent volontairement simples :

- heures de la semaine ;
- heures du mois ;
- salaire du jour selon le taux horaire ;
- salaire de la semaine ;
- salaire du mois ;
- total des acomptes ;
- reste a payer.

Le module ne gere pas la TVA, les cotisations, les bulletins de paie ou la comptabilite avancee.

Les acomptes ne modifient jamais les heures ni le salaire calcule. Ils sont uniquement deduits du montant restant a payer.

## Stockage

Comme le Planning, IndexedDB est le moteur prioritaire. Si IndexedDB n'est pas disponible, la meme API bascule vers un fallback persistant `localStorage`.

Cette V1 est locale au navigateur. Elle prepare une synchronisation future avec le noyau Kynexy Core, sans bloquer l'usage immediat des petites entreprises.
