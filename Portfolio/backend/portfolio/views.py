from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Project, Skill, About
from .serializers import ProjectSerializer, SkillSerializer, AboutSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project model
    Provides CRUD operations for projects
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class SkillViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Skill model
    Provides CRUD operations for skills
    """
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer


class AboutViewSet(viewsets.ModelViewSet):
    """
    ViewSet for About model
    Provides CRUD operations for about section
    """
    queryset = About.objects.all()
    serializer_class = AboutSerializer


@api_view(['GET'])
def api_overview(request):
    """API overview endpoint"""
    api_urls = {
        'projects': '/api/projects/',
        'skills': '/api/skills/',
        'about': '/api/about/',
    }
    return Response(api_urls)
