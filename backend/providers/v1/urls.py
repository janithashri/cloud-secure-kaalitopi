from django.urls import path
from providers.v1.views import (
    ProviderListCreateView,
    ProviderDetailView,
    TestConnectionView,
    InventoryRunListView,
    InventoryPullView,
)
from api.v1.views import (
    FindingSuppressView,
    ProviderFindingsListView,
    ProviderFindingsSummaryView,
)

urlpatterns = [
    path("providers/", ProviderListCreateView.as_view(), name="provider-list-create"),
    path("providers/<int:pk>/", ProviderDetailView.as_view(), name="provider-detail"),
    path("providers/<int:pk>/test-connection/", TestConnectionView.as_view(), name="provider-test-connection"),
    path("providers/<int:pk>/inventory-pull/", InventoryPullView.as_view(), name="provider-inventory-pull"),
    path("providers/<int:pk>/inventory-runs/", InventoryRunListView.as_view(), name="provider-inventory-runs"),
    path("providers/<int:provider_id>/findings/", ProviderFindingsListView.as_view(), name="provider-findings-list"),
    path("providers/<int:provider_id>/findings/summary/", ProviderFindingsSummaryView.as_view(), name="provider-findings-summary"),
    path("findings/<int:id>/suppress/", FindingSuppressView.as_view(), name="finding-suppress"),
]
