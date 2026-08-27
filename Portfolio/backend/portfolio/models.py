from django.db import models

# Create your models here.


class Project(models.Model):
    """Model for portfolio projects"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.URLField(blank=True, null=True)
    link = models.URLField(blank=True, null=True)
    github_link = models.URLField(blank=True, null=True)
    technologies = models.CharField(max_length=500, help_text="Comma-separated list of technologies")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Skill(models.Model):
    """Model for skills"""
    name = models.CharField(max_length=100)
    proficiency = models.IntegerField(choices=[(i, str(i)) for i in range(1, 101)], help_text="0-100")
    category = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


class About(models.Model):
    """Model for about section"""
    title = models.CharField(max_length=200)
    bio = models.TextField()
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    resume_link = models.URLField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "About"

    def __str__(self):
        return self.title
