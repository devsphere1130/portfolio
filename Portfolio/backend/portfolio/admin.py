from django.contrib import admin
from .models import Project, Skill, About

# Register your models here.


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'created_at', 'updated_at']
    search_fields = ['title', 'description']
    list_filter = ['created_at']


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'proficiency', 'category']
    search_fields = ['name']
    list_filter = ['category']


@admin.register(About)
class AboutAdmin(admin.ModelAdmin):
    list_display = ['title', 'email']
    search_fields = ['title', 'email']
