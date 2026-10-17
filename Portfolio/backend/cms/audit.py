import logging

logger = logging.getLogger(__name__)

# Keys that must never be written to the audit log, even by accident.
_FORBIDDEN = {'password', 'new_password', 'current_password', 'token', 'session', 'secret', 'csrf'}


def _clean(metadata):
    return {k: v for k, v in (metadata or {}).items() if not any(word in k.lower() for word in _FORBIDDEN)}


def record(actor, action, entity_type, entity_id, summary, metadata=None, request=None):
    """Write one audit row. Never raises: auditing must not break the action being audited."""
    from accounts.signals import client_ip

    from .models import AuditLog

    try:
        AuditLog.objects.create(
            actor_user=actor if getattr(actor, 'is_authenticated', False) else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id or ''),
            summary=str(summary)[:300],
            metadata=_clean(metadata),
            ip_address=client_ip(request) if request is not None else None,
        )
    except Exception:  # pragma: no cover - logged, never fatal
        logger.exception('Could not write audit log entry for %s', action)
