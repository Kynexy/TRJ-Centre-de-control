# Kynexy Core V1

Kynexy ne doit pas commencer par une abstraction totale. Le noyau doit rester lisible pour l'equipe produit et maintenable pour les developpeurs, tout en preparant une evolution vers un moteur de connaissances.

La ligne directrice est simple :

**les domaines stockent les faits metier, le contexte relie les domaines, l'intelligence interprete le contexte.**

## Architecture recommandee

### 1. Tables metier

Les tables metier restent explicites quand elles simplifient le produit :

- `appointments` : rendez-vous, planning, disponibilites.
- `team_members` : equipe, roles, competences.
- `tasks` : actions a suivre.
- `finance_accounts` et `finance_positions` : comptes, wallets externes, positions, rendement observe.
- `document_refs` : documents geres dans Kynexy ou references externes Glide.
- `integration_refs` : liens avec Glide, Google, wallet providers ou autres sources.
- `profiles` et `workspace_members` : identite utilisateur et droits d'acces, sans confondre la personne avec son espace de travail.

Ces tables rendent les requetes simples et les contraintes metier naturelles.

### 2. Couche contexte

La couche contexte ne remplace pas les domaines. Elle les connecte.

- `context_events` : journal chronologique de ce qui s'est passe.
- `context_links` : relations transverses entre objets de domaines differents.
- `context_facts` : faits observes ou deduits a propos d'un objet.
- `context_snapshots` : resume stable d'un contexte a un moment donne.

Cette couche est le debut du moteur de connaissances. Elle permet a Kynexy de se souvenir, de relier et de comprendre sans enfermer toute la V1 dans une table `entities` trop generale.

### 3. Couche intelligence

KYNEXY n'est pas le proprietaire des donnees.

Il est un moteur d'interpretation branche sur le contexte :

- `intelligence_engines` : moteurs disponibles, dont KYNEXY aujourd'hui.
- `intelligence_outputs` : analyses, alertes, recommandations et aides a la decision.
- `automation_intents` : automatisations proposees, confirmees ou executees.

Si un meilleur moteur remplace KYNEXY demain, les tables metier et le contexte restent valables.

### 4. Securite et multi-espace

Le schema prepare Supabase avec une isolation par workspace :

- `profiles` represente l'utilisateur.
- `workspace_members` represente son appartenance a un espace.
- les tables metier et contexte portent toutes `workspace_id`.
- les politiques RLS filtrent les donnees selon cette appartenance.

L'ajout d'un membre dans un workspace doit rester une action serveur ou admin. Un utilisateur ne doit pas pouvoir s'ajouter librement a un espace simplement parce qu'il connait son identifiant.

## Pourquoi ce modele est preferable en V1

Un modele 100% knowledge graph serait premature :

- les contraintes metier deviendraient plus difficiles a exprimer ;
- les requetes simples seraient plus verbeuses ;
- l'equipe risquerait de perdre du temps a modeliser au lieu de livrer ;
- Supabase/PostgreSQL apporte deja assez de puissance pour demarrer.

Un modele purement relationnel serait trop court a long terme :

- il relierait mal les domaines ;
- il garderait l'historique comme un detail secondaire ;
- il rendrait KYNEXY dependant de silos applicatifs ;
- il limiterait les futures recommandations transverses.

Le meilleur compromis est donc :

**PostgreSQL relationnel + tables contexte transverses + historique complet.**

## Evolution progressive

### V1

Objectif : construire le coeur produit robuste.

- Tables metier claires.
- Evenements transverses.
- Relations simples entre objets.
- Historique exploitable.
- Premiers outputs de KYNEXY.

### V2

Objectif : enrichir la comprehension.

- Ajout de signaux derives.
- Snapshots de contexte par jour, projet, client ou equipe.
- Recommandations plus structurees.
- Automatisations avec validation humaine.
- Ajout possible de `pgvector` pour la recherche semantique.

### V3

Objectif : passer vers un knowledge graph si les usages le justifient.

- Relations plus typées.
- Parcours multi-sauts plus frequents.
- Detection de patterns.
- Graph database ou extension graphe uniquement si PostgreSQL devient limitant.

## Regle de decision

Une nouvelle table metier est justifiee quand :

- elle simplifie fortement les requetes ;
- elle porte des contraintes claires ;
- elle represente un domaine important et stable.

Une relation transverse est justifiee quand :

- elle relie plusieurs domaines ;
- elle aide KYNEXY a expliquer une recommandation ;
- elle enrichit l'historique ou la prise de decision.

Une abstraction plus forte est justifiee seulement quand :

- le meme schema se repete dans plusieurs domaines ;
- les usages reels exigent des parcours complexes ;
- l'abstraction reduit la complexite au lieu de la deplacer.

## Vision produit

Kynexy ne construit pas plusieurs applications dans une seule interface.

Kynexy construit un contexte professionnel vivant.

Le planning, l'equipe, la finance, les documents et les integrations ne sont pas des modules isoles. Ce sont des sources de contexte. La valeur apparait quand KYNEXY, ou un futur moteur, comprend les relations entre ces informations et aide l'utilisateur a decider plus vite, mieux, et avec moins d'effort mental.
