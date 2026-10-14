from django.contrib import admin

from .models import (
    AuditLog,
    Capability,
    MediaAsset,
    Page,
    PageSection,
    Project,
    ProjectMedia,
    Service,
    SiteSettings,
    TeamMember,
    TechnologyItem,
)


class SectionInline(admin.StackedInline):
    model = PageSection
    extra = 0


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['slug', 'title', 'status', 'published_at']
    inlines = [SectionInline]
    readonly_fields = ['published_snapshot', 'published_at', 'content_updated_at']


class GalleryInline(admin.TabularInline):
    model = ProjectMedia
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'is_featured', 'display_order']
    list_filter = ['status', 'is_featured']
    search_fields = ['title', 'slug']
    inlines = [GalleryInline]


for model in (TeamMember, Capability, Service, TechnologyItem):
    admin.site.register(model, list_display=['__str__', 'status', 'display_order'], list_filter=['status'])

admin.site.register(SiteSettings)
admin.site.register(MediaAsset, list_display=['original_filename', 'width', 'height', 'file_size_bytes', 'created_at'],
                    readonly_fields=['file', 'thumbnail', 'mime_type', 'source_format', 'file_size_bytes', 'width', 'height'])


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'actor_user', 'action', 'summary']
    list_filter = ['action', 'entity_type']
    search_fields = ['summary']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
