from rest_framework import serializers
from .models import Project, Skill, About


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'image', 'link', 'github_link', 'technologies', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'proficiency', 'category']


class AboutSerializer(serializers.ModelSerializer):
    class Meta:
        model = About
        fields = ['id', 'title', 'bio', 'email', 'phone', 'location', 'resume_link']
