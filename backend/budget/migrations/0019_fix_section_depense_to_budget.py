from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0018_alter_lignebudgetaire_section'),
    ]

    operations = [
        migrations.RunSQL(
            sql="UPDATE ligne_budgetaire SET section = 'BUDGET' WHERE section = 'DEPENSE';",
            reverse_sql="UPDATE ligne_budgetaire SET section = 'DEPENSE' WHERE section = 'BUDGET';",
        ),
    ]
