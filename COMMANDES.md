# Commandes quotidiennes

Toutes les commandes sont à exécuter depuis la racine du dépôt.

## Environnement

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 web db
docker compose stop
```

EspoCRM est accessible sur :

```text
https://friendly-adventure-7rr4jqr7r5q2x7x9-8080.app.github.dev
```

Identifiants de développement : `admin` / `1`.

## Développement de l’extension

Après chaque modification dans `src` :

```bash
npm run sync
```

Après une modification de métadonnées :

```bash
npm run sync
npm run clear-cache
```

Pour reconstruire EspoCRM après la synchronisation :

```bash
npm run rebuild
```

## Recréation complète du site

La base MariaDB doit être démarrée. Arrêter le serveur web pendant que `site`
est recréé :

```bash
docker compose up -d db
docker compose stop web
npm run all
docker compose run --rm --no-deps --entrypoint sh web -c 'chown -R 1000:www-data /var/www/html/custom /var/www/html/client/custom && chown -R www-data:www-data /var/www/html/data && chmod -R ug+rwX /var/www/html/data /var/www/html/custom /var/www/html/client/custom && find /var/www/html/data /var/www/html/custom /var/www/html/client/custom -type d -exec chmod g+s {} +'
docker compose up -d web
```

## ZIP installable

```bash
npm run extension
ls -lh build/
```
