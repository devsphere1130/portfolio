from django.apps import AppConfig


class CmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cms'
    verbose_name = 'Content'

    def ready(self):
        from . import checks  # noqa: F401  (registers `manage.py check --deploy` rules)
