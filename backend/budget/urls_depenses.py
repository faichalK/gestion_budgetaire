from django.urls import path
from .views_depenses import DepenseListView, DepenseDetailView, ValiderDepenseView, RejeterDepenseView
from .views_pieces   import DepensePiecesView, DepensePieceDeleteView, PieceDownloadView

urlpatterns = [
    # Dépenses
    path('',                   DepenseListView.as_view(),   name='depense-list'),
    path('<uuid:pk>/',         DepenseDetailView.as_view(), name='depense-detail'),
    path('<uuid:pk>/valider/', ValiderDepenseView.as_view(), name='depense-valider'),
    path('<uuid:pk>/rejeter/', RejeterDepenseView.as_view(), name='depense-rejeter'),

    # Pièces justificatives (liées à une Depense)
    path('<uuid:depense_id>/pieces/',          DepensePiecesView.as_view(),      name='depense-pieces'),
    path('<uuid:depense_id>/pieces/<uuid:pk>/',DepensePieceDeleteView.as_view(), name='depense-piece-delete'),
]
