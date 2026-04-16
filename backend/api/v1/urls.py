from django.urls import path
from api.v1.views import (
    AttackEngineQueryCatalogView,
    AttackEngineRunAllView,
    AttackEngineSingleQueryView,
    CartographyGraphView,
    GraphDataView,
    InventorySummaryView,
    LoginView,
    LogoutView,
    MeView,
    IaCScanTriggerView,
    RegisterView,
    IaCFindingListView,
    IaCFindingDetailView
)
import api.v1.views as views

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path('iac/scan/', IaCScanTriggerView.as_view(), name='iac-scan-trigger'),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path('iac/findings/', IaCFindingListView.as_view(), name='iac-findings-list'),
    path('iac/findings/<int:pk>/', IaCFindingDetailView.as_view(), name='iac-finding-delete'),
    path("me/", MeView.as_view(), name="auth-me"),
    path('iac/repositories/', views.get_audited_repositories, name='iac-repos'),
    path('iac/repositories/delete/', views.delete_repository_findings, name='iac-repo-delete'),
    path(
        "providers/<int:provider_id>/inventory-summary/",
        InventorySummaryView.as_view(),
        name="inventory-summary",
    ),
    path(
        "providers/<int:provider_id>/graph/",
        GraphDataView.as_view(),
        name="inventory-graph",
    ),
    path(
        "providers/<int:provider_id>/graph/cartography/",
        CartographyGraphView.as_view(),
        name="cartography-graph",
    ),
    path(
        "providers/<int:provider_id>/attack-engine/run/",
        AttackEngineRunAllView.as_view(),
        name="attack-engine-run",
    ),
    path(
        "providers/<int:provider_id>/attack-engine/query/<str:query_id>/",
        AttackEngineSingleQueryView.as_view(),
        name="attack-engine-single",
    ),
    path(
        "attack-engine/queries/",
        AttackEngineQueryCatalogView.as_view(),
        name="attack-engine-catalog",
    ),
]
