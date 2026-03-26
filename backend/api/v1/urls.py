from django.urls import path
from api.v1.views import (
    GraphDataView,
    InventorySummaryView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
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
]
