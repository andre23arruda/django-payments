from django.db import models
from django.utils.safestring import mark_safe
from django.utils.timezone import now

INPUT_OUTPUT = (
	('Entrada', 'Entrada'),
	('Saída', 'Saída'),
)

GREEN = '#00c800'
RED = '#ff0000'


class InputOutput(models.Model):
	date = models.DateField(default=now, verbose_name='Data')
	type = models.CharField(max_length=10, choices=INPUT_OUTPUT, default='Entrada', verbose_name='Entrada e Saída')
	value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Valor (R$)')
	obs = models.TextField(verbose_name='Observação')
	created_by = models.ForeignKey(
		'auth.User', on_delete=models.SET_NULL, blank=True, null=True, verbose_name='Criado por'
	)

	class Meta:
		verbose_name = 'Entrada/Saída'
		verbose_name_plural = 'Entradas/Saídas'
		ordering = ('-date',)

	def __str__(self):
		if self.type == 'Entrada':
			return f'{self.date.strftime("%d/%m/%Y")} (+{self.value})'
		return f'{self.date.strftime("%d/%m/%Y")} (-{self.value})'

	def render_obs(self):
		if len(self.obs) > 30:
			return f'{self.obs[:30]}...'
		return self.obs

	render_obs.short_description = 'Observação'

	def render_type(self):
		component_style = 'color: white; padding: 2px; border-radius: 5px;'
		if self.type == 'Entrada':
			return mark_safe(f'<span style="background-color: {GREEN}; {component_style}">{self.type}</span>')
		return mark_safe(f'<span style="background-color: {RED}; {component_style}">{self.type}</span>')

	render_type.short_description = 'Tipo'
