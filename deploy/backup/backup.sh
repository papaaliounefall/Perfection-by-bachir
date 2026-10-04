#!/bin/sh
# Sauvegarde quotidienne : base PostgreSQL + photos, conservées BACKUP_KEEP_DAYS jours.
# Les fichiers sont écrits dans le volume « backups » : copiez-les AUSSI hors du serveur
# (docker compose cp backup:/backups ./sauvegardes, puis stockage cloud) — une sauvegarde
# sur la même machine ne protège pas d'une panne.
set -eu
KEEP="${BACKUP_KEEP_DAYS:-14}"
while true; do
  STAMP=$(date +%Y-%m-%d_%H%M)
  if pg_dump --format=custom --file="/backups/base_${STAMP}.dump"; then
    echo "[$STAMP] base sauvegardée"
  else
    echo "[$STAMP] ÉCHEC de la sauvegarde de la base" >&2
  fi
  tar -czf "/backups/photos_${STAMP}.tar.gz" -C /media . && echo "[$STAMP] photos sauvegardées"
  find /backups -type f -mtime +"$KEEP" -delete
  sleep 86400
done
