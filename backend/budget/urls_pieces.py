from django.urls import path
from .views_pieces import PieceDownloadView

urlpatterns = [
    path('<uuid:pk>/download/', PieceDownloadView.as_view(), name='piece-download'),
]
