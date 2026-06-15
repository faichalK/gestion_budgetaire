"""
Atlas Finance — URLs principales
Toutes les routes API sont accessibles sous /api/
"""
from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve as static_serve
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path("api/accounts/health/", health_check, name="health-check"),
    path("manager/", admin.site.urls),

    # Comptes : auth, utilisateurs, départements
    path("api/accounts/", include("accounts.urls")),

    # Budget : budgets annuels, allocations, budgets, lignes
    path("api/budget/", include("budget.urls")),

    # Audit : logs
    path("api/audit/", include("audit.urls")),

    # Rapports & KPIs
    path("api/v1/rapports/", include("budget.urls_rapports")),

    # Dépenses (consommations avec workflow validation)
    path("api/v1/depenses/", include("budget.urls_depenses")),

    # Pièces justificatives — téléchargement sécurisé
    path("api/v1/pieces/", include("budget.urls_pieces")),

    # Intelligence Artificielle
    path("api/v1/ia/", include("budget.urls_ia")),

    # Notifications in-app
    path("api/v1/notifications/", include("budget.urls_notifications")),

    # Fichiers statiques du build React (images, fonts, etc. à la racine de frontend_dist)
    re_path(r'^(?P<path>.*\.(js|css|jpg|jpeg|png|svg|ico|webp|woff|woff2|ttf|eot|map|txt|json))$',
            static_serve,
            {'document_root': settings.BASE_DIR / 'frontend_dist'}),

    # React SPA — catch-all (doit être en dernier)
    re_path(r'^(?!api|manager|static|media).*$', TemplateView.as_view(template_name='index.html')),
]

# En production, les fichiers media doivent être servis par le reverse proxy / stockage dédié.
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
    ]
