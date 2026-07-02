# ClientDB V1

Le module Clients / Devis / Factures est volontairement autonome.

## Perimetre

- Reserve a l'administrateur.
- Non connecte au noyau KYNEXY pour cette version.
- Non connecte au Planning, a l'Equipe ou aux futurs modules.
- Concu pour produire rapidement des devis et factures professionnels.

## Donnees proprietaires

ClientDB possede uniquement :

- les clients ;
- les devis ;
- les factures.

Les documents conservent un instantane du client au moment de leur creation afin de garder un historique lisible meme si la fiche client est modifiee ensuite.

## Calculs

L'utilisateur saisit uniquement le montant TTC et le taux de TVA.

ClientDB calcule automatiquement :

- HT ;
- TVA ;
- TTC.

Le calcul reste simple et adapte a une petite entreprise de services. Il n'y a pas de stock, de catalogue de prestations, de comptabilite avancee ou de gestion de permissions dans cette version.

## Persistance

ClientDB utilise IndexedDB quand le navigateur l'autorise.

Si IndexedDB est indisponible, une persistance locale de secours par localStorage est utilisee pour ne pas bloquer le module en usage fichier local.

## PDF et e-mail

Le PDF est genere depuis les donnees du document.

L'action e-mail utilise le partage natif du navigateur quand il accepte les fichiers. Sinon, le module ouvre un e-mail pre-rempli, sans piece jointe automatique, car `mailto:` ne permet pas d'attacher un PDF.
