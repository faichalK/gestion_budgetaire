from django.contrib import admin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from django.contrib import messages
from audit.mixins import AuditMixin
from .models import Utilisateur, Departement

# Atlas Finance utilise des rôles métier — le modèle Group de Django n'est pas utilisé
admin.site.unregister(Group)


# ── Département ───────────────────────────────────────────────────────────────

@admin.register(Departement)
class DepartementAdmin(AuditMixin, admin.ModelAdmin):
    list_display         = ['code_badge', 'nom', 'statut_actif', 'nb_utilisateurs']
    list_display_links   = ['code_badge', 'nom']
    list_filter          = ['actif']
    search_fields        = ['code', 'nom']
    ordering             = ['code']
    list_per_page        = 25
    show_full_result_count = True

    @admin.display(description='Code', ordering='code')
    def code_badge(self, obj):
        return format_html(
            '<code style="background:#EEF2FF;color:#4F46E5;padding:2px 8px;'
            'border-radius:5px;font-weight:700;font-size:12px">{}</code>',
            obj.code,
        )

    @admin.display(description='Actif', ordering='actif')
    def statut_actif(self, obj):
        if obj.actif:
            return format_html(
                '<span style="background:#F0FDF4;color:#16A34A;padding:2px 10px;'
                'border-radius:99px;font-size:11px;font-weight:700">✓ Actif</span>'
            )
        return format_html(
            '<span style="background:#FEF2F2;color:#DC2626;padding:2px 10px;'
            'border-radius:99px;font-size:11px;font-weight:700">✗ Inactif</span>'
        )

    @admin.display(description='Utilisateurs')
    def nb_utilisateurs(self, obj):
        n = obj.utilisateurs.count()
        return format_html(
            '<span style="font-family:monospace;font-weight:700;color:#6366F1">{}</span>', n
        )


# ── Filtres FlexList pour Utilisateur ─────────────────────────────────────────

class RoleFilter(admin.SimpleListFilter):
    title          = 'Rôle'
    parameter_name = 'role'

    ROLE_LABELS = {
        'ADMINISTRATEUR': 'Administrateur',
        'GESTIONNAIRE'  : 'Gestionnaire',
        'COMPTABLE'     : 'Comptable',
    }

    def lookups(self, request, model_admin):
        return list(self.ROLE_LABELS.items())

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset


# ── Utilisateur ───────────────────────────────────────────────────────────────

@admin.register(Utilisateur)
class UtilisateurAdmin(AuditMixin, admin.ModelAdmin):
    list_display         = [
        'photo_vignette', 'matricule', 'email', 'nom_complet',
        'role_badge', 'departement', 'statut_badge',
    ]
    list_display_links   = ['matricule', 'email']
    list_filter          = [RoleFilter, 'actif', 'departement']
    search_fields        = ['matricule', 'email', 'nom', 'prenom']
    ordering             = ['nom', 'prenom']
    list_per_page        = 25
    list_select_related  = ['departement']
    show_full_result_count = True
    readonly_fields      = ['date_creation', 'derniere_connexion', 'apercu_photo', 'id']

    fieldsets = (
        ('Identité', {
            'fields': ('id', 'matricule', 'email', 'nom', 'prenom', 'photo', 'apercu_photo'),
        }),
        ('Rôle & Département', {
            'fields': ('role', 'departement'),
        }),
        ('Accès & Statut', {
            'fields': ('actif', 'is_staff', 'is_superuser'),
        }),
        ('Dates', {
            'fields': ('date_creation', 'derniere_connexion'),
            'classes': ('collapse',),
        }),
    )

    add_fieldsets = (
        ('Nouvel utilisateur', {
            'fields': ('matricule', 'email', 'nom', 'prenom', 'role', 'departement', 'password1', 'password2'),
        }),
    )

    # ── Colonnes personnalisées ──────────────────────────────────────────────

    ROLE_COLORS = {
        'ADMINISTRATEUR': ('#EEF2FF', '#4F46E5'),
        'GESTIONNAIRE'  : ('#FFFBEB', '#D97706'),
        'COMPTABLE'     : ('#F0FDF4', '#16A34A'),
    }

    @admin.display(description='Photo')
    def photo_vignette(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width:38px;height:38px;border-radius:50%;'
                'object-fit:cover;border:2px solid #E5E7EB">',
                obj.photo.url,
            )
        initials = (obj.prenom[:1] + obj.nom[:1]).upper() if obj.prenom and obj.nom else '?'
        return format_html(
            '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#4F46E5);'
            'display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">{}</div>',
            initials,
        )

    @admin.display(description='Nom complet', ordering='nom')
    def nom_complet(self, obj):
        return f'{obj.prenom} {obj.nom}'

    @admin.display(description='Rôle', ordering='role')
    def role_badge(self, obj):
        bg, color = self.ROLE_COLORS.get(obj.role, ('#F3F4F6', '#6B7280'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;border-radius:99px;'
            'font-size:11px;font-weight:700">{}</span>',
            bg, color, obj.role,
        )

    @admin.display(description='Statut', ordering='actif')
    def statut_badge(self, obj):
        if obj.actif:
            return format_html(
                '<span style="background:#F0FDF4;color:#16A34A;padding:2px 10px;'
                'border-radius:99px;font-size:11px;font-weight:700">✓ Actif</span>'
            )
        return format_html(
            '<span style="background:#FEF2F2;color:#DC2626;padding:2px 10px;'
            'border-radius:99px;font-size:11px;font-weight:700">✗ Inactif</span>'
        )

    @admin.display(description='Aperçu photo')
    def apercu_photo(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width:100px;height:100px;border-radius:12px;object-fit:cover">',
                obj.photo.url,
            )
        return '—'

    # ── Formulaire de création ───────────────────────────────────────────────

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            from django import forms

            class CreateForm(forms.ModelForm):
                password1 = forms.CharField(label='Mot de passe', widget=forms.PasswordInput)
                password2 = forms.CharField(label='Confirmer mot de passe', widget=forms.PasswordInput)

                class Meta:
                    model  = Utilisateur
                    fields = ('matricule', 'email', 'nom', 'prenom', 'role', 'departement')

                def clean(self):
                    cd = super().clean()
                    if cd.get('password1') != cd.get('password2'):
                        raise forms.ValidationError('Les mots de passe ne correspondent pas.')
                    return cd

                def save(self, commit=True):
                    user = super().save(commit=False)
                    user.set_password(self.cleaned_data['password1'])
                    if commit:
                        user.save()
                    return user

            return CreateForm
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.add_fieldsets
        return self.fieldsets

    # ── Actions groupées ─────────────────────────────────────────────────────

    actions = ['activer_utilisateurs', 'desactiver_utilisateurs']

    @admin.action(description='✓ Activer les utilisateurs sélectionnés')
    def activer_utilisateurs(self, request, queryset):
        nb = queryset.update(actif=True)
        self.message_user(request, f'{nb} utilisateur(s) activé(s).', messages.SUCCESS)

    @admin.action(description='✗ Désactiver les utilisateurs sélectionnés')
    def desactiver_utilisateurs(self, request, queryset):
        nb = queryset.update(actif=False)
        self.message_user(request, f'{nb} utilisateur(s) désactivé(s).', messages.WARNING)
