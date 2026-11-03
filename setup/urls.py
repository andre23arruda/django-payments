from django.contrib import admin
from django.urls import path

from .views import index

urlpatterns = [
	path('admin/', admin.site.urls),
	path('', index, name='index'),
]


admin.site.index_title = 'Dashboard'
admin.site.site_header = 'Dashboard'
admin.site.site_title = 'Dashboard'
