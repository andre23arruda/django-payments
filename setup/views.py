from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods


def health_check(request):
	return JsonResponse({'status': 'ok'})


@require_http_methods(['GET'])
def index(request):
	return render(request, 'index.html')
