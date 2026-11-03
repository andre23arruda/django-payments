import json
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.utils import timezone
from payments.models import InputOutput

MONTH_NAMES_PT = {
	1: 'Jan',
	2: 'Fev',
	3: 'Mar',
	4: 'Abr',
	5: 'Mai',
	6: 'Jun',
	7: 'Jul',
	8: 'Ago',
	9: 'Set',
	10: 'Out',
	11: 'Nov',
	12: 'Dez',
}


def format_brl(value: Decimal | float | int | None) -> str:
	"""Formata um valor numérico para o padrão monetário brasileiro (R$ 1.234,56)."""
	val = float(value or 0)
	sign = '-' if val < 0 else ''
	abs_val = abs(val)
	formatted = f'{abs_val:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
	return f'{sign}R$ {formatted}'


def _generate_continuous_months(start_ym: str, end_ym: str) -> list[str]:
	"""Gera uma lista contínua de meses no formato 'YYYY-MM' entre start_ym e end_ym."""
	try:
		s_year, s_month = map(int, start_ym.split('-'))
		e_year, e_month = map(int, end_ym.split('-'))
	except (ValueError, AttributeError):
		today = timezone.localdate()
		return [f'{today.year}-{today.month:02d}']

	months = []
	cur_y, cur_m = s_year, s_month
	while (cur_y < e_year) or (cur_y == e_year and cur_m <= e_month):
		months.append(f'{cur_y}-{cur_m:02d}')
		cur_m += 1
		if cur_m > 12:
			cur_m = 1
			cur_y += 1
	return months


def _subtract_months(ref_date: date, num_months: int) -> str:
	"""Retorna 'YYYY-MM' subtraindo num_months de ref_date."""
	year = ref_date.year
	month = ref_date.month - num_months
	while month <= 0:
		month += 12
		year -= 1
	return f'{year}-{month:02d}'


def get_dashboard_stats(user: User | None = None) -> dict[str, Any]:
	"""
	Calcula estatísticas de Fluxo de Caixa (Entradas e Saídas) para o dashboard admin.
	"""
	is_auth = user is not None and getattr(user, 'is_authenticated', False)
	is_super = user.is_superuser if is_auth else False

	has_perm = (
		is_super
		or (user is None)
		or (
			is_auth
			and (
				user.has_perm('payments.view_inputoutput')
				or user.has_perm('payments.add_inputoutput')
				or user.has_perm('payments.change_inputoutput')
			)
		)
	)

	qs = InputOutput.objects.all() if has_perm else InputOutput.objects.none()
	today = timezone.localdate()

	# 1. Totais Gerais
	agg_all = qs.aggregate(
		entradas=Sum('value', filter=Q(type='Entrada')),
		saidas=Sum('value', filter=Q(type='Saída')),
		qtd_entradas=Count('id', filter=Q(type='Entrada')),
		qtd_saidas=Count('id', filter=Q(type='Saída')),
	)

	total_entradas = float(agg_all['entradas'] or 0)
	total_saidas = float(agg_all['saidas'] or 0)
	saldo_liquido = total_entradas - total_saidas
	qtd_entradas = int(agg_all['qtd_entradas'] or 0)
	qtd_saidas = int(agg_all['qtd_saidas'] or 0)
	total_lancamentos = qtd_entradas + qtd_saidas

	ticket_medio_entrada = (total_entradas / qtd_entradas) if qtd_entradas > 0 else 0.0
	ticket_medio_saida = (total_saidas / qtd_saidas) if qtd_saidas > 0 else 0.0

	volume_total = total_entradas + total_saidas
	perc_entradas = round((total_entradas / volume_total * 100), 1) if volume_total > 0 else 0.0
	perc_saidas = round((total_saidas / volume_total * 100), 1) if volume_total > 0 else 0.0
	margem_liquida = round((saldo_liquido / total_entradas * 100), 1) if total_entradas > 0 else 0.0

	# 2. Totais do Mês Atual
	qs_month = qs.filter(date__year=today.year, date__month=today.month)
	agg_month = qs_month.aggregate(
		entradas=Sum('value', filter=Q(type='Entrada')),
		saidas=Sum('value', filter=Q(type='Saída')),
		qtd_entradas=Count('id', filter=Q(type='Entrada')),
		qtd_saidas=Count('id', filter=Q(type='Saída')),
	)
	mes_entradas = float(agg_month['entradas'] or 0)
	mes_saidas = float(agg_month['saidas'] or 0)
	mes_saldo = mes_entradas - mes_saidas
	mes_lancamentos = int(agg_month['qtd_entradas'] or 0) + int(agg_month['qtd_saidas'] or 0)
	mes_nome = f'{MONTH_NAMES_PT[today.month]}/{today.year}'

	# 3. Séries Temporais (Mensal e Diária)
	entradas_por_mes: dict[str, float] = {}
	saidas_por_mes: dict[str, float] = {}
	qtd_in_por_mes: dict[str, int] = {}
	qtd_out_por_mes: dict[str, int] = {}

	entradas_por_dia: dict[str, float] = {}
	saidas_por_dia: dict[str, float] = {}
	qtd_in_por_dia: dict[str, int] = {}
	qtd_out_por_dia: dict[str, int] = {}

	raw_months: set[str] = set()
	max_record_date = today

	for item_date, item_type, item_val in qs.filter(date__isnull=False).values_list('date', 'type', 'value'):
		val_f = float(item_val or 0)
		m_key = f'{item_date.year}-{item_date.month:02d}'
		d_key = item_date.strftime('%Y-%m-%d')
		raw_months.add(m_key)
		if item_date > max_record_date:
			max_record_date = item_date

		if item_type == 'Entrada':
			entradas_por_mes[m_key] = round(entradas_por_mes.get(m_key, 0.0) + val_f, 2)
			qtd_in_por_mes[m_key] = qtd_in_por_mes.get(m_key, 0) + 1
			entradas_por_dia[d_key] = round(entradas_por_dia.get(d_key, 0.0) + val_f, 2)
			qtd_in_por_dia[d_key] = qtd_in_por_dia.get(d_key, 0) + 1
		else:
			saidas_por_mes[m_key] = round(saidas_por_mes.get(m_key, 0.0) + val_f, 2)
			qtd_out_por_mes[m_key] = qtd_out_por_mes.get(m_key, 0) + 1
			saidas_por_dia[d_key] = round(saidas_por_dia.get(d_key, 0.0) + val_f, 2)
			qtd_out_por_dia[d_key] = qtd_out_por_dia.get(d_key, 0) + 1

	# Garante pelo menos 6 meses contínuos no gráfico mensal para boa visualização
	default_start_ym = _subtract_months(max_record_date, 5)
	end_ym = f'{max_record_date.year}-{max_record_date.month:02d}'
	if raw_months:
		first_ym = min(min(raw_months), default_start_ym)
		last_ym = max(max(raw_months), end_ym)
		all_months = _generate_continuous_months(first_ym, last_ym)
	else:
		all_months = _generate_continuous_months(default_start_ym, end_ym)

	month_labels = [f'{MONTH_NAMES_PT.get(int(m.split("-")[1]), m)}/{m.split("-")[0][2:]}' for m in all_months]
	month_entradas = [round(entradas_por_mes.get(m, 0.0), 2) for m in all_months]
	month_saidas = [round(saidas_por_mes.get(m, 0.0), 2) for m in all_months]
	month_saldo = [round(e - s, 2) for e, s in zip(month_entradas, month_saidas)]
	month_qtd_in = [qtd_in_por_mes.get(m, 0) for m in all_months]
	month_qtd_out = [qtd_out_por_mes.get(m, 0) for m in all_months]

	# Série diária dos últimos 90 dias até a data de referência
	daily_days = [max_record_date - timedelta(days=i) for i in range(89, -1, -1)]
	daily_keys = [d.strftime('%Y-%m-%d') for d in daily_days]
	daily_labels = [d.strftime('%d/%m') for d in daily_days]
	daily_entradas = [round(entradas_por_dia.get(k, 0.0), 2) for k in daily_keys]
	daily_saidas = [round(saidas_por_dia.get(k, 0.0), 2) for k in daily_keys]
	daily_saldo = [round(e - s, 2) for e, s in zip(daily_entradas, daily_saidas)]
	daily_qtd_in = [qtd_in_por_dia.get(k, 0) for k in daily_keys]
	daily_qtd_out = [qtd_out_por_dia.get(k, 0) for k in daily_keys]

	# 4. Últimos lançamentos para tabela de acesso rápido
	recent_records = []
	for obj in qs.order_by('-date', '-id')[:8]:
		recent_records.append(
			{
				'id': obj.id,
				'date': obj.date.strftime('%d/%m/%Y') if obj.date else '',
				'type': obj.type,
				'is_entrada': obj.type == 'Entrada',
				'value': float(obj.value),
				'value_formatted': format_brl(obj.value),
				'obs': obj.obs if len(obj.obs) <= 45 else f'{obj.obs[:45]}...',
				'obs_full': obj.obs,
			}
		)

	summary = {
		'total_entradas': total_entradas,
		'total_entradas_fmt': format_brl(total_entradas),
		'total_saidas': total_saidas,
		'total_saidas_fmt': format_brl(total_saidas),
		'saldo_liquido': saldo_liquido,
		'saldo_liquido_fmt': format_brl(saldo_liquido),
		'saldo_positivo': saldo_liquido >= 0,
		'qtd_entradas': qtd_entradas,
		'qtd_saidas': qtd_saidas,
		'total_lancamentos': total_lancamentos,
		'ticket_medio_entrada': ticket_medio_entrada,
		'ticket_medio_entrada_fmt': format_brl(ticket_medio_entrada),
		'ticket_medio_saida': ticket_medio_saida,
		'ticket_medio_saida_fmt': format_brl(ticket_medio_saida),
		'perc_entradas': perc_entradas,
		'perc_saidas': perc_saidas,
		'margem_liquida': margem_liquida,
		'mes_nome': mes_nome,
		'mes_entradas': mes_entradas,
		'mes_entradas_fmt': format_brl(mes_entradas),
		'mes_saidas': mes_saidas,
		'mes_saidas_fmt': format_brl(mes_saidas),
		'mes_saldo': mes_saldo,
		'mes_saldo_fmt': format_brl(mes_saldo),
		'mes_saldo_positivo': mes_saldo >= 0,
		'mes_lancamentos': mes_lancamentos,
	}

	chart_data = {
		'has_any_perm': has_perm,
		'monthly': {
			'keys': all_months,
			'labels': month_labels,
			'entradas': month_entradas,
			'saidas': month_saidas,
			'saldo': month_saldo,
			'qtd_entradas': month_qtd_in,
			'qtd_saidas': month_qtd_out,
		},
		'daily': {
			'keys': daily_keys,
			'labels': daily_labels,
			'entradas': daily_entradas,
			'saidas': daily_saidas,
			'saldo': daily_saldo,
			'qtd_entradas': daily_qtd_in,
			'qtd_saidas': daily_qtd_out,
		},
		'distribution': {
			'labels': ['Entradas', 'Saídas'],
			'colors': ['#10b981', '#ef4444'],
			'values': [round(total_entradas, 2), round(total_saidas, 2)],
			'counts': [qtd_entradas, qtd_saidas],
		},
	}

	return {
		'has_any_perm': has_perm,
		'summary': summary,
		'recent_records': recent_records,
		'chart_data': chart_data,
		'chart_data_json': json.dumps(chart_data),
	}
