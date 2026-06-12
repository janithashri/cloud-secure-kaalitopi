from django.urls import path

from api.routes.graph_intelligence import GraphIntelligenceRunView, GraphIntelligenceView

urlpatterns = [
    path(
        "providers/<int:provider_id>/graph-intelligence/",
        GraphIntelligenceView.as_view(),
        name="graph-intelligence",
    ),
    path(
        "providers/<int:provider_id>/graph-intelligence/run/",
        GraphIntelligenceRunView.as_view(),
        name="graph-intelligence-run",
    ),
]
