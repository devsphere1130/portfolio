"""Remove a video's files from storage once its row is gone (also when a whole project is deleted)."""

from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import ProjectVideo


@receiver(post_delete, sender=ProjectVideo)
def delete_video_files(sender, instance, **kwargs):
    names = [(f.storage, f.name) for f in (instance.video_file, instance.captions_file) if f]
    if instance.pending_key:
        names.append((instance.video_file.storage, instance.pending_key))
    transaction.on_commit(lambda: [storage.delete(name) for storage, name in names])
