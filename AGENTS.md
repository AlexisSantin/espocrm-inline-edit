# Consignes de développement

- Développer l’extension uniquement dans `src`.
- Ne jamais modifier directement les fichiers de `site`.
- Après une modification dans `src`, exécuter `npm run sync`.
- Si des métadonnées changent, exécuter `npm run clear-cache` après la synchronisation.
- Utiliser `npm run extension` pour produire le ZIP installable.
- Respecter systématiquement les ACL EspoCRM dans le code serveur et frontend.
- Avant de surcharger une vue, inspecter le code de la version EspoCRM effectivement présente dans `site`.
