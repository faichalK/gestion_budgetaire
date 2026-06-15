"""
Atlas Finance — Configuration Celery
Broker : Redis. Beat scheduler : django_celery_beat.
"""
import os

from celery import Celery

# Utilise les settings Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("budgetflow")

# Lit la configuration depuis Django settings (préfixe CELERY_)
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodécouverte des tâches dans tous les apps installées
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> None:
    """Tâche de débogage pour vérifier que Celery fonctionne."""
    print(f"Request: {self.request!r}")
