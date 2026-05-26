"""
Création automatique du superuser au démarrage du conteneur.
Appelé par start.sh — ne fait rien si l'utilisateur existe déjà.
Les identifiants sont lus depuis les variables d'environnement Railway.
"""
import os
import sys

sys.path.insert(0, '/app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from accounts.models import Utilisateur

email     = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password  = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
nom       = os.environ.get('DJANGO_SUPERUSER_NOM',      'Admin')
prenom    = os.environ.get('DJANGO_SUPERUSER_PRENOM',   'Super')
matricule = os.environ.get('DJANGO_SUPERUSER_MATRICULE', 'ADM001')

if not email or not password:
    print('[superuser] DJANGO_SUPERUSER_EMAIL ou DJANGO_SUPERUSER_PASSWORD non défini — ignoré.')
    sys.exit(0)

if Utilisateur.objects.filter(email=email).exists():
    print(f'[superuser] déjà existant : {email}')
else:
    Utilisateur.objects.create_superuser(
        email=email,
        password=password,
        nom=nom,
        prenom=prenom,
        matricule=matricule,
    )
    print(f'[superuser] créé : {email}')
