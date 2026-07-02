# KYNEXY Context Hub V1

`kynexy-context-hub.js` est une couche de lecture seule.

Il ne remplace aucune base de donnees et ne modifie aucune interface.

## Objectif

Le Hub produit un objet unique :

```js
window.KynexySharedContext
```

Cet objet rassemble le contexte deja expose par les modules existants :

- `window.KynexyPlanningState`
- `window.KynexyTeamState`
- `window.KynexyClientModule.getState()`
- `window.AurelPageState`
- `window.KynexyContextState`
- `window.KynexyCryptoState`
- `window.AurelState.weather`

Si un module n'est pas charge, le Hub garde simplement son domaine en `unavailable`.

## Principe

Chaque module reste proprietaire de ses donnees :

- Planning garde `KynexyPlanningDB`.
- Equipe garde `KynexyTeamDB`.
- CRM garde `ClientDB`.
- KYNEXY garde `AurelDB`.
- Crypto garde son etat runtime.
- Today garde sa vue de synthese.

Le Hub ne fait que lire, normaliser et exposer un contexte transversal.

## Structure produite

```js
{
  version: "1.0.0",
  status: "ready",
  generatedAt: "2026-07-01T00:00:00.000Z",
  connectedDomains: 3,
  domains: {
    planning: {
      domain: "planning",
      source: "builtin",
      status: "ready",
      summary: "2 rendez-vous aujourd'hui.",
      facts: [],
      risks: [],
      actions: [],
      raw: {}
    }
  },
  summaries: [],
  facts: [],
  risks: [],
  actions: []
}
```

## API

### `window.KynexyContextHub.refresh()`

Relit les etats disponibles et met a jour `window.KynexySharedContext`.

### `window.KynexyContextHub.getContext()`

Retourne le dernier contexte calcule.

### `window.KynexyContextHub.getDomain(domain)`

Retourne un domaine precis, par exemple :

```js
window.KynexyContextHub.getDomain("planning")
```

### `window.KynexyContextHub.register(domain, collector)`

Ajoute un collecteur futur sans modifier le Hub :

```js
window.KynexyContextHub.register("documents", function () {
  return {
    status: "ready",
    summary: "Documents disponibles.",
    facts: [],
    risks: [],
    actions: [],
    raw: window.SomeFutureState
  };
});
```

Le collecteur peut aussi etre un objet statique.

### `window.KynexyContextHub.unregister(domain)`

Retire un collecteur ajoute par `register`.

## Evenement

Apres chaque `refresh`, le Hub emet :

```js
kynexy:shared-context:updated
```

avec :

```js
event.detail.context
```

Cet evenement permet a une future page ou a KYNEXY de se mettre a jour sans dependance directe entre modules.

## Regles de securite architecturale

- Le Hub ne doit jamais ecrire dans `PlanningDB`, `TeamDB`, `ClientDB` ou `AurelDB`.
- Le Hub ne doit jamais modifier le DOM.
- Le Hub ne doit jamais declencher une action metier.
- Le Hub ne doit jamais devenir proprietaire des donnees.
- Les modules publient leurs etats ; le Hub les lit.

## Integration recommandee plus tard

Charger le fichier apres les modules d'une page :

```html
<script src="kynexy-context-hub.js"></script>
```

Puis appeler :

```js
window.KynexyContextHub.refresh();
```

Les pages existantes n'ont pas besoin d'etre modifiees pour que le fichier existe. Son integration dans les interfaces doit rester une etape separee.
