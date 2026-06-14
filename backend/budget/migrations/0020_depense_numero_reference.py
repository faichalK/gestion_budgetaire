from django.db import migrations, models


def backfill_numero(apps, schema_editor):
    Depense = apps.get_model('budget', 'Depense')
    from django.db.models import F

    # Pour chaque budget, numéroter les dépenses par ordre de date de création
    budget_ids = Depense.objects.values_list('budget_id', flat=True).distinct()
    for budget_id in budget_ids:
        depenses = Depense.objects.filter(budget_id=budget_id).order_by('date')
        for i, dep in enumerate(depenses, start=1):
            dep.numero = i
            dep.save(update_fields=['numero'])


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0019_fix_section_depense_to_budget'),
    ]

    operations = [
        migrations.AddField(
            model_name='depense',
            name='numero',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Numéro séquentiel'),
        ),
        migrations.RunPython(backfill_numero, reverse_code=migrations.RunPython.noop),
    ]
