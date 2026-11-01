from typing import Any

from django import template

from utils.dashboard import get_dashboard_stats

register = template.Library()


@register.simple_tag(takes_context=True)
def get_admin_dashboard_metrics(context: dict[str, Any]) -> dict[str, Any]:
	request = context.get('request')
	user = getattr(request, 'user', None) if request else None
	return get_dashboard_stats(user=user)

