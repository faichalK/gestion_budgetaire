from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0015_budget_annuel_cloture'),
    ]

    operations = [
        migrations.AddField(
            model_name='consommationligne',
            name='designation',
            field=models.CharField(blank=True, default='', max_length=500, verbose_name='Désignation du poste'),
        ),
        migrations.AddField(
            model_name='consommationligne',
            name='quantite',
            field=models.DecimalField(blank=True, decimal_places=3, max_digits=12, null=True, verbose_name='Quantité'),
        ),
        migrations.AddField(
            model_name='consommationligne',
            name='unite',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='Unité'),
        ),
        migrations.AddField(
            model_name='consommationligne',
            name='prix_unitaire',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name='Prix unitaire (FCFA)'),
        ),
    ]
