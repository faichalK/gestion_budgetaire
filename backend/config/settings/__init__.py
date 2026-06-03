"""
Django settings pour BudgetFlow.
Ce fichier est le point d'entrée de config.settings (package).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Charger les variables d'environnement depuis .env
load_dotenv(BASE_DIR / '.env')


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', '')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

_extra_hosts    = os.getenv('ALLOWED_HOSTS', '')
_railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '')
_render_domain  = os.getenv('RENDER_EXTERNAL_HOSTNAME', '')  # injecté automatiquement par Render
ALLOWED_HOSTS = [
    'localhost', '127.0.0.1',
    '.railway.app',
    '.up.railway.app',
    '.onrender.com',          # wildcard Render
] + [h.strip() for h in _extra_hosts.split(',') if h.strip()]
if _railway_domain:
    ALLOWED_HOSTS.append(_railway_domain)
if _render_domain:
    ALLOWED_HOSTS.append(_render_domain)


# Application definition

INSTALLED_APPS = [
    'jazzmin',                           # ← doit précéder django.contrib.admin
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Local
    'accounts',
    'budget',
    'audit',
]

# ── Jazzmin — interface d'administration Atlas Finance ────────────────────────
JAZZMIN_SETTINGS = {
    "site_title":   "Atlas Finance",
    "site_header":  "Atlas Finance",
    "site_brand":   "AF",
    "welcome_sign": "Administration — Atlas Finance",
    "copyright":    "Atlas Finance · Gestion Budgétaire",
    "user_avatar":  None,

    "show_sidebar":           True,
    "navigation_expanded":    True,
    "related_modal_active":   False,
    "show_ui_builder":        False,
    "use_google_fonts_cdn":   True,
    "changeform_format":      "horizontal_tabs",

    "custom_css": "jazzmin/css/custom.css",
    "custom_js":  None,

    "icons": {
        "auth":                           "fas fa-users-cog",
        "accounts":                       "fas fa-users",
        "accounts.utilisateur":           "fas fa-user-tie",
        "accounts.departement":           "fas fa-building",
        "budget":                         "fas fa-wallet",
        "budget.budgetannuel":            "fas fa-calendar-alt",
        "budget.allocationdepartementale":"fas fa-chart-pie",
        "budget.budget":                  "fas fa-file-invoice-dollar",
        "budget.lignebudgetaire":         "fas fa-list-alt",
        "budget.consommationligne":       "fas fa-receipt",
        "audit":                          "fas fa-shield-alt",
        "audit.logaudit":                 "fas fa-history",
    },
    "default_icon_parents":  "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    "order_with_respect_to": ["accounts", "budget", "audit"],
    "topmenu_links": [
        {"name": "Tableau de bord", "url": "admin:index", "permissions": ["auth.view_user"]},
    ],
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text":       False,
    "footer_small_text":       False,
    "body_small_text":         False,
    "brand_small_text":        False,
    "brand_colour":            "navbar-dark",
    "accent":                  "accent-warning",
    "navbar":                  "navbar-dark",
    "no_navbar_border":        True,
    "navbar_fixed":            True,
    "layout_boxed":            False,
    "footer_fixed":            False,
    "sidebar_fixed":           True,
    "sidebar":                 "sidebar-dark-primary",
    "sidebar_nav_small_text":  False,
    "sidebar_disable_expand":  False,
    "sidebar_nav_child_indent":True,
    "sidebar_nav_compact_style":False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style":   False,
    "theme":                   "default",
    "dark_mode_theme":         None,
    "button_classes": {
        "primary":   "btn-primary",
        "secondary": "btn-secondary",
        "info":      "btn-info",
        "warning":   "btn-warning",
        "danger":    "btn-danger",
        "success":   "btn-success",
    },
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates', BASE_DIR / 'frontend_dist'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database — DATABASE_URL (production Docker) a priorité, sinon variables individuelles
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'config'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
_db_url = os.getenv('DATABASE_URL', '')
# Valider que l'URL a bien un schéma PostgreSQL avant de parser
if _db_url and any(_db_url.startswith(s) for s in ('postgres://', 'postgresql://', 'postgis://')):
    import dj_database_url as _dj_db_url
    DATABASES['default'] = _dj_db_url.parse(_db_url, conn_max_age=600, ssl_require=True)


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Abidjan'
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [d for d in [BASE_DIR / 'static', BASE_DIR / 'frontend_dist'] if d.exists()]

# Whitenoise — compression brotli/gzip, pas de re-hash (Vite hash déjà les assets)
STORAGES = {
    'default':     {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Hashage Argon2 (recommandé OWASP) ─────────────────────────────────────────
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',   # fallback pour anciens hash
]

# ── Sécurité — toujours actifs ────────────────────────────────────────────────
SECURE_CONTENT_TYPE_NOSNIFF = True   # empêche MIME-sniffing (XSS)
X_FRAME_OPTIONS             = 'DENY' # clickjacking
SECURE_BROWSER_XSS_FILTER   = True   # header X-XSS-Protection

# ── CSRF trusted origins (obligatoire en prod pour /admin/ et API POST) ───────
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app',
]
if _railway_domain:
    CSRF_TRUSTED_ORIGINS.append(f'https://{_railway_domain}')
_csrf_extra = os.getenv('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS += [o.strip() for o in _csrf_extra.split(',') if o.strip()]

# ── Sécurité — uniquement en production (HTTPS) ───────────────────────────────
if not DEBUG:
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY manquante en production.")
    SECURE_SSL_REDIRECT              = False  # Railway gère le SSL à l'edge
    SECURE_HSTS_SECONDS              = 31_536_000  # 1 an
    SECURE_HSTS_INCLUDE_SUBDOMAINS   = True
    SECURE_HSTS_PRELOAD              = True
    SESSION_COOKIE_SECURE            = True
    CSRF_COOKIE_SECURE               = True
    SECURE_PROXY_SSL_HEADER          = ('HTTP_X_FORWARDED_PROTO', 'https')

# Modèle utilisateur personnalisé
AUTH_USER_MODEL = 'accounts.Utilisateur'

# Fichiers media (photos utilisateurs, pièces jointes)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}


# Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'UPDATE_LAST_LOGIN': False,
}


# CORS - autorise le frontend React (Vite) + Railway + Render + Netlify
_cors_extra   = os.getenv('CORS_ALLOWED_ORIGINS', '')
_netlify_url  = os.getenv('NETLIFY_URL', '')
_netlify_site = os.getenv('NETLIFY_SITE_URL', '')
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
] + [o.strip() for o in _cors_extra.split(',') if o.strip()]
if _railway_domain:
    CORS_ALLOWED_ORIGINS.append(f'https://{_railway_domain}')
if _render_domain:
    CORS_ALLOWED_ORIGINS.append(f'https://{_render_domain}')
if _netlify_url:
    CORS_ALLOWED_ORIGINS.append(_netlify_url.rstrip('/'))
if _netlify_site:
    CORS_ALLOWED_ORIGINS.append(_netlify_site.rstrip('/'))
CORS_ALLOW_CREDENTIALS = True

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'colored': {
            '()': 'django.utils.log.ServerFormatter',
            'format': '[{asctime}] {levelname} {message}',
            'style': '{',
        },
        'api': {
            'format': '%(asctime)s  %(levelname)-8s  %(name)s  %(message)s',
            'datefmt': '%H:%M:%S',
        },
    },

    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },

    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'api',
        },
    },

    'loggers': {
        # Requêtes HTTP Django (runserver)
        'django.request': {
            'handlers':  ['console'],
            'level':     'DEBUG',
            'propagate': False,
        },
        # Requêtes DB (SQL) — passer à DEBUG pour voir les requêtes SQL
        'django.db.backends': {
            'handlers':  ['console'],
            'level':     'WARNING',
            'propagate': False,
        },
        # Nos apps métier
        'budget': {
            'handlers':  ['console'],
            'level':     'DEBUG',
            'propagate': False,
        },
        'accounts': {
            'handlers':  ['console'],
            'level':     'DEBUG',
            'propagate': False,
        },
        'audit': {
            'handlers':  ['console'],
            'level':     'DEBUG',
            'propagate': False,
        },
    },
}

# IA
SKIP_CLAUDE_API = os.getenv('SKIP_CLAUDE_API', 'True').lower() in ('true', '1', 'yes')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

# ── Email / SMTP ───────────────────────────────────────────────────────────────
_email_user     = os.getenv('EMAIL_HOST_USER', '').strip()
_email_password = os.getenv('EMAIL_HOST_PASSWORD', '').strip()

# SMTP uniquement si les deux credentials sont présents — sinon console (évite le timeout gunicorn)
if _email_user and _email_password:
    EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST          = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT          = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS       = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_USE_SSL       = False
    EMAIL_TIMEOUT       = 10   # secondes — évite le freeze infini
    EMAIL_HOST_USER     = _email_user
    EMAIL_HOST_PASSWORD = _email_password
else:
    # Pas de credentials → console (lien affiché dans les logs Railway)
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    f'Gestion budgétaire <{_email_user}>' if _email_user else 'Gestion budgétaire <noreply@gestion-budgetaire.bf>',
)

# URL du frontend React (utilisé dans les liens des emails)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
