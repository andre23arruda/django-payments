import csv
import datetime

from django.conf.locale.en import formats as en
from django.conf.locale.pt_BR import formats as pt_BR
from django.contrib import admin
from django.http import HttpResponse

from .models import InputOutput

pt_BR.DATE_FORMAT = 'd/m/Y'
pt_BR.DATETIME_FORMAT = 'H:i:s - d/m/Y'
en.DATE_FORMAT = 'd/m/Y'
en.DATETIME_FORMAT = 'H:i:s - d/m/Y'


@admin.action(description='Exportar CSV')
def export_csv(modeladmin, request, queryset):
	now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
	response = HttpResponse(content_type='text/csv; charset=utf-8')
	response['Content-Disposition'] = f'attachment; filename="relatorio-{now}.csv"'

	writer = csv.writer(response)
	writer.writerow(['data', 'obs', 'valor', 'tipo'])

	for row in queryset.order_by('-date'):
		writer.writerow([row.date, row.obs, row.value, row.type])

	return response


@admin.register(InputOutput)
class InputOutputRegister(admin.ModelAdmin):
	actions = [export_csv]
	date_hierarchy = 'date'
	list_display = ['date', 'render_obs', 'value', 'render_type']
	list_display_links = ['date', 'render_obs']
	list_per_page = 30
	list_filter = ['date', 'type']
	search_fields = ['obs']

	def changelist_view(self, request, extra_context=None):
		if request.method == 'POST' and request.POST.get('action') == 'export_csv':
			selected = request.POST.getlist(admin.helpers.ACTION_CHECKBOX_NAME)
			if not selected:
				cl = self.get_changelist_instance(request)
				return export_csv(self, request, cl.get_queryset(request))
		return super().changelist_view(request, extra_context)
