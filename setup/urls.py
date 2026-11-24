from django.contrib import admin
from django.shortcuts import render
from django.urls import path

from .views import health_check, index


urlpatterns = [
	path('admin/', admin.site.urls),
	path('', index, name='index'),
	path('health/', health_check, name='health_check'),
]

admin.site.index_title = 'Dashboard'
admin.site.site_header = 'Dashboard'
admin.site.site_title = 'Dashboard'
