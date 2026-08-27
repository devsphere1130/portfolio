from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, SkillViewSet, AboutViewSet, api_overview

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'skills', SkillViewSet)
router.register(r'about', AboutViewSet)

urlpatterns = [
    path('', api_overview, name='api-overview'),
    path('', include(router.urls)),
]
