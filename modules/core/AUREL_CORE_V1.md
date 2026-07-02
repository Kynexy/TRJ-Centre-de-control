# KYNEXY Core V1

KYNEXY devient la couche d'intelligence de Kynexy.

Il ne possede pas les donnees metier. Les modules restent proprietaires :

- Planning possede les rendez-vous.
- Equipe possede les salaries, pointages et acomptes.
- Meteo possede les informations temps reel.
- Les futurs modules possederont leurs propres faits metier.

KYNEXY consulte ces sources en lecture seule, relie les signaux, puis construit une reponse.

## AurelDB

La couche `AurelDB` isole les operations propres au noyau KYNEXY :

- memoire personnelle ;
- rappels ;
- preferences ;
- elements epingles ;
- historique de conversation ;
- contexte courant ;
- connecteurs lecture seule ;
- moteur de brief transverse.

Le HTML de KYNEXY ne manipule pas directement ces donnees. Il passe par `AurelDB`.

## Context Manager

Le gestionnaire de contexte maintient :

- page ouverte ;
- URL ;
- rendez-vous selectionne ;
- salarie selectionne ;
- jour affiche ;
- mois affiche.

Le contexte est expose via `window.KynexyAurelContext` et `window.AurelState.context`.

## Connecteurs V1

### Planning

Lecture seule via `KynexyPlanningDB` :

- rendez-vous du jour ;
- rendez-vous a venir ;
- notes des rendez-vous.

### Equipe

Lecture seule via `KynexyTeamDB` :

- salaries ;
- heures ;
- acomptes ;
- salaires calcules ;
- restes a payer.

### Meteo

Lecture seule via `window.AurelState.weather` si disponible, ou via Open-Meteo si la configuration est chargee.

## Moteur de reponse

Le moteur `buildOperationalBrief` est volontairement independant d'un fournisseur IA.

Il peut fonctionner sans LLM aujourd'hui, puis recevoir plus tard un moteur `generateText`, un agent local ou une API externe sans changer les connecteurs.

## Voix

La conversation vocale est preparee comme un pipeline remplacable :

- Speech To Text ;
- question texte ;
- connecteurs ;
- moteur de reponse ;
- Text To Speech.

Les implementations STT/TTS peuvent etre remplacees sans modifier le noyau.

## Avatar

L'avatar officiel n'utilise plus de GIF.

Il est genere en HTML/CSS leger et possede les etats :

- veille ;
- ecoute ;
- reflexion ;
- reponse ;
- content ;
- alerte.
