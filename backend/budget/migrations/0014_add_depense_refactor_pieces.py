"""
Migration 0014 — Refonte pièces justificatives
=================================================
1. Crée le modèle Depense (table 'depense')
2. Ajoute ConsommationLigne.depense (FK nullable vers Depense)
3. Migration de données : crée une Depense par groupe de ConsommationLigne
4. Supprime ConsommationLigne.piece_justificative (FileField obsolète)
5. Remplace PieceJustificative (ancienne FK vers ConsommationLigne)
   par la nouvelle structure (FK vers Depense + nouveaux champs)

Rollback : les données des pièces existantes (table vide) ne sont pas perdues.
"""
import uuid
from django.db import migrations, models
import django.db.models.deletion


# ── Data migration ─────────────────────────────────────────────────────────────

def create_depenses_from_lignes(apps, schema_editor):
    """
    Pour chaque ConsommationLigne existante :
    - Regroupe par groupe_ref si présent, sinon traite individuellement
    - Crée une Depense par groupe
    - Lie les ConsommationLigne à leur Depense
    """
    ConsommationLigne = apps.get_model('budget', 'ConsommationLigne')
    Depense           = apps.get_model('budget', 'Depense')

    processed_groups = set()

    for cl in ConsommationLigne.objects.select_related('ligne').order_by('date'):
        group_key = cl.groupe_ref

        if group_key and group_key in processed_groups:
            continue  # déjà traité dans ce groupe

        if group_key:
            group_lines = list(
                ConsommationLigne.objects.filter(groupe_ref=group_key)
                                         .select_related('ligne')
            )
            processed_groups.add(group_key)
        else:
            group_lines = [cl]

        # Budget via ligne.budget_id
        budget_id = cl.ligne.budget_id
        montant_total = sum(float(l.montant) for l in group_lines)

        depense = Depense(
            id=uuid.uuid4(),
            budget_id=budget_id,
            statut=cl.statut,
            fournisseur=cl.fournisseur or '',
            note=cl.note or '',
            motif_rejet=cl.motif_rejet or '',
            enregistre_par_id=cl.enregistre_par_id,
            validateur_id=cl.validateur_id,
            montant_total=montant_total,
        )
        depense.save()

        for ligne in group_lines:
            ConsommationLigne.objects.filter(pk=ligne.pk).update(depense_id=depense.pk)


def reverse_depenses(apps, schema_editor):
    """Rollback : vider la table Depense (les ConsommationLigne gardent leur depense_id nullable)."""
    Depense = apps.get_model('budget', 'Depense')
    Depense.objects.all().delete()


# ── Migration ──────────────────────────────────────────────────────────────────

class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0013_add_groupe_ref_to_consommation'),
        ('accounts', '0001_initial'),
    ]

    operations = [

        # 1. Créer la table Depense
        migrations.CreateModel(
            name='Depense',
            fields=[
                ('id',            models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('statut',        models.CharField(max_length=12, choices=[('SAISIE','En attente'),('VALIDEE','Validée'),('REJETEE','Rejetée')], default='SAISIE', verbose_name='Statut')),
                ('fournisseur',   models.CharField(max_length=200, blank=True, verbose_name='Fournisseur')),
                ('note',          models.CharField(max_length=500, blank=True, verbose_name='Note / description')),
                ('motif_rejet',   models.CharField(max_length=500, blank=True, verbose_name='Motif de rejet')),
                ('date',          models.DateTimeField(auto_now_add=True, verbose_name='Date de soumission')),
                ('montant_total', models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name='Montant total')),
                ('budget', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='depenses',
                    to='budget.budget',
                    verbose_name='Budget',
                )),
                ('enregistre_par', models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name='depenses_soumises',
                    to='accounts.utilisateur',
                    verbose_name='Enregistré par',
                )),
                ('validateur', models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name='depenses_traitees',
                    to='accounts.utilisateur',
                    verbose_name='Validé/Rejeté par',
                )),
            ],
            options={
                'verbose_name':        'Dépense',
                'verbose_name_plural': 'Dépenses',
                'db_table':            'depense',
                'ordering':            ['-date'],
            },
        ),

        # 2. Ajouter ConsommationLigne.depense (nullable → remplie par la data migration)
        migrations.AddField(
            model_name='consommationligne',
            name='depense',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                null=True, blank=True,
                related_name='lignes',
                to='budget.depense',
                verbose_name='Dépense parente',
            ),
        ),

        # 3. Data migration : créer les Depense et lier les ConsommationLigne
        migrations.RunPython(create_depenses_from_lignes, reverse_depenses),

        # 4. Supprimer l'ancien FileField piece_justificative de ConsommationLigne
        migrations.RemoveField(
            model_name='consommationligne',
            name='piece_justificative',
        ),

        # 5a. Supprimer l'ancienne PieceJustificative (FK vers ConsommationLigne)
        migrations.DeleteModel(
            name='PieceJustificative',
        ),

        # 5b. Recréer PieceJustificative avec la nouvelle structure (FK → Depense)
        migrations.CreateModel(
            name='PieceJustificative',
            fields=[
                ('id',           models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('fichier',      models.FileField(upload_to='pieces_justificatives/%Y/%m/', verbose_name='Fichier')),
                ('nom_original', models.CharField(max_length=255, verbose_name='Nom original')),
                ('taille',       models.PositiveIntegerField(verbose_name='Taille (octets)')),
                ('type_mime',    models.CharField(max_length=100, verbose_name='Type MIME')),
                ('description',  models.CharField(max_length=255, blank=True, verbose_name='Description')),
                ('md5_hash',     models.CharField(max_length=32, blank=True, verbose_name='Hash MD5')),
                ('uploaded_at',  models.DateTimeField(auto_now_add=True, verbose_name="Date d'upload")),
                ('depense', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pieces_justificatives',
                    to='budget.depense',
                    verbose_name='Dépense',
                )),
                ('uploaded_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='pieces_uploadees',
                    to='accounts.utilisateur',
                    verbose_name='Uploadé par',
                )),
            ],
            options={
                'verbose_name':        'Pièce justificative',
                'verbose_name_plural': 'Pièces justificatives',
                'db_table':            'piece_justificative',
                'ordering':            ['-uploaded_at'],
            },
        ),
    ]
