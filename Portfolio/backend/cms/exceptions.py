import logging

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def json_not_found(request, exception=None):
    """404 for URLs no view matched. API clients get JSON instead of an HTML page."""
    from django.http import HttpResponseNotFound, JsonResponse

    if request.path.startswith('/api/'):
        return JsonResponse({'detail': 'Not found.'}, status=404)
    return HttpResponseNotFound('<h1>Not Found</h1>')


def api_exception_handler(exc, context):
    """Consistent JSON errors; unexpected errors are logged and never leak internals."""
    if isinstance(exc, ProtectedError):
        return Response(
            {'detail': 'This item is still used elsewhere. Remove those references first.'},
            status=status.HTTP_409_CONFLICT,
        )
    response = exception_handler(exc, context)
    if response is None:
        logger.exception('Unhandled API error', exc_info=exc)
        return Response({'detail': 'Something went wrong on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return response
