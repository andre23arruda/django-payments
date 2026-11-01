document.addEventListener('DOMContentLoaded', function () {
    const dataElement = document.getElementById('dashboard-data');
    if (!dataElement) return;

    let dashboardData;
    try {
        dashboardData = JSON.parse(dataElement.textContent);
    } catch (e) {
        console.error('Erro ao processar dados do dashboard:', e);
        return;
    }

    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não carregado. Gráficos não serão inicializados.');
        return;
    }

    if (!dashboardData.has_any_perm) {
        return;
    }

    function formatBRL(value) {
        const num = Number(value || 0);
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getThemeColors() {
        const isDark = document.body.classList.contains('dark-mode') || document.body.classList.contains('theme-dark');
        return {
            isDark: isDark,
            textColor: isDark ? '#9ca3af' : '#6b7280',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            tooltipBg: isDark ? '#1f2937' : '#111827',
            donutBorder: isDark ? '#343a40' : '#ffffff',
        };
    }

    // State for main cash flow chart
    let currentView = 'monthly'; // 'monthly' | 'daily'
    let currentChartType = 'bar'; // 'bar' | 'line'
    let currentMonthlyPeriod = 'all'; // 'all' | '12' | '6'
    let currentDailyPeriod = '30'; // '7' | '30' | '90'
    let timelineChart = null;

    // State for donut chart
    let currentDonutMetric = 'values'; // 'values' | 'counts'
    let donutChart = null;

    // Helper: Get filtered series according to currentView and period
    function getFilteredData() {
        const source = currentView === 'monthly'
            ? (dashboardData.monthly || {})
            : (dashboardData.daily || {});

        const fullLabels = source.labels || [];
        const fullEntradas = source.entradas || [];
        const fullSaidas = source.saidas || [];
        const fullSaldo = source.saldo || [];
        const fullQtdIn = source.qtd_entradas || [];
        const fullQtdOut = source.qtd_saidas || [];

        let startIndex = 0;
        let periodLabel = 'Geral';

        if (currentView === 'monthly') {
            if (currentMonthlyPeriod === '6') {
                startIndex = Math.max(0, fullLabels.length - 6);
                periodLabel = 'Últimos 6 Meses';
            } else if (currentMonthlyPeriod === '12') {
                startIndex = Math.max(0, fullLabels.length - 12);
                periodLabel = 'Últimos 12 Meses';
            } else {
                periodLabel = 'Geral';
            }
        } else {
            const days = parseInt(currentDailyPeriod, 10) || 30;
            startIndex = Math.max(0, fullLabels.length - days);
            periodLabel = `Últimos ${days} Dias`;
        }

        return {
            periodLabel: periodLabel,
            labels: fullLabels.slice(startIndex),
            entradas: fullEntradas.slice(startIndex),
            saidas: fullSaidas.slice(startIndex),
            saldo: fullSaldo.slice(startIndex),
            qtd_entradas: fullQtdIn.slice(startIndex),
            qtd_saidas: fullQtdOut.slice(startIndex),
        };
    }

    // Build datasets for Chart.js based on currentChartType ('bar' or 'line')
    function buildDatasets(filtered) {
        const isBar = currentChartType === 'bar';

        return [
            {
                type: isBar ? 'bar' : 'line',
                key: 'entradas',
                label: 'Entradas',
                data: filtered.entradas,
                borderColor: '#10b981',
                backgroundColor: isBar ? 'rgba(16, 185, 129, 0.82)' : 'rgba(16, 185, 129, 0.14)',
                borderWidth: isBar ? 1.5 : 2.5,
                borderRadius: isBar ? 5 : 0,
                fill: !isBar,
                tension: 0.35,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#ffffff',
                pointHoverRadius: 6,
                pointRadius: isBar ? 0 : 4,
                order: 2,
            },
            {
                type: isBar ? 'bar' : 'line',
                key: 'saidas',
                label: 'Saídas',
                data: filtered.saidas,
                borderColor: '#ef4444',
                backgroundColor: isBar ? 'rgba(239, 68, 68, 0.82)' : 'rgba(239, 68, 68, 0.14)',
                borderWidth: isBar ? 1.5 : 2.5,
                borderRadius: isBar ? 5 : 0,
                fill: !isBar,
                tension: 0.35,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#ffffff',
                pointHoverRadius: 6,
                pointRadius: isBar ? 0 : 4,
                order: 3,
            },
            {
                type: 'line',
                key: 'saldo',
                label: 'Saldo Líquido',
                data: filtered.saldo,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2.5,
                borderDash: isBar ? [5, 4] : [],
                fill: false,
                tension: 0.35,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointHoverRadius: 6,
                pointRadius: 3.5,
                order: 1,
            },
        ];
    }

    // Update KPI Cards & Donut Chart when period changes
    function syncCardsAndDonut(filtered) {
        const isAllTime = currentView === 'monthly' && currentMonthlyPeriod === 'all';
        const distAll = dashboardData.distribution || { values: [0, 0], counts: [0, 0] };

        let sumEntradas = 0;
        let sumSaidas = 0;
        let sumQtdIn = 0;
        let sumQtdOut = 0;

        if (isAllTime) {
            sumEntradas = (distAll.values && distAll.values[0]) || 0;
            sumSaidas = (distAll.values && distAll.values[1]) || 0;
            sumQtdIn = (distAll.counts && distAll.counts[0]) || 0;
            sumQtdOut = (distAll.counts && distAll.counts[1]) || 0;
        } else {
            sumEntradas = filtered.entradas.reduce((a, b) => a + b, 0);
            sumSaidas = filtered.saidas.reduce((a, b) => a + b, 0);
            sumQtdIn = filtered.qtd_entradas.reduce((a, b) => a + b, 0);
            sumQtdOut = filtered.qtd_saidas.reduce((a, b) => a + b, 0);
        }

        const saldo = sumEntradas - sumSaidas;
        const isPositivo = saldo >= 0;
        const margem = sumEntradas > 0 ? ((saldo / sumEntradas) * 100).toFixed(1) : '0.0';

        const periodBadge = document.getElementById('dashboard-period-badge');
        if (periodBadge) {
            periodBadge.textContent = `Período: ${filtered.periodLabel}`;
        }

        const kpiEntradasVal = document.getElementById('kpi-entradas-value');
        const kpiSaidasVal = document.getElementById('kpi-saidas-value');
        const kpiSaldoVal = document.getElementById('kpi-saldo-value');
        const kpiSaldoDot = document.getElementById('kpi-saldo-dot');
        const kpiSaldoStatus = document.getElementById('kpi-saldo-status');
        const kpiSaldoMargin = document.getElementById('kpi-saldo-margin');

        if (kpiEntradasVal) kpiEntradasVal.textContent = formatBRL(sumEntradas);
        if (kpiSaidasVal) kpiSaidasVal.textContent = formatBRL(sumSaidas);
        if (kpiSaldoVal) {
            kpiSaldoVal.textContent = formatBRL(saldo);
            kpiSaldoVal.classList.toggle('text-emerald', isPositivo);
            kpiSaldoVal.classList.toggle('text-rose', !isPositivo);
        }
        if (kpiSaldoDot) {
            kpiSaldoDot.classList.toggle('pulse-dot-danger', !isPositivo);
        }
        if (kpiSaldoStatus) {
            kpiSaldoStatus.textContent = isPositivo ? 'Saldo Positivo' : 'Saldo Negativo';
            kpiSaldoStatus.classList.toggle('text-success', isPositivo);
            kpiSaldoStatus.classList.toggle('text-danger', !isPositivo);
        }
        if (kpiSaldoMargin) {
            kpiSaldoMargin.textContent = `(${margem}% margem)`;
        }

        // Update Donut Chart with period values/counts
        if (donutChart) {
            donutChart.data.datasets[0].data = currentDonutMetric === 'values'
                ? [Number(sumEntradas.toFixed(2)), Number(sumSaidas.toFixed(2))]
                : [sumQtdIn, sumQtdOut];
            donutChart.update();
        }
    }

    // Initialize Main Cash Flow Chart
    const timelineCtx = document.getElementById('dashboardTimelineChart');
    if (timelineCtx) {
        const filtered = getFilteredData();
        const theme = getThemeColors();

        timelineChart = new Chart(timelineCtx, {
            type: 'bar',
            data: {
                labels: filtered.labels,
                datasets: buildDatasets(filtered),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 15,
                            font: {
                                size: 12,
                                family: 'Oswald, sans-serif',
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        padding: 10,
                        boxPadding: 4,
                        usePointStyle: true,
                        callbacks: {
                            label: function (context) {
                                return ` ${context.dataset.label}: ${formatBRL(context.parsed.y)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: theme.gridColor,
                        },
                        ticks: {
                            color: theme.textColor,
                            maxRotation: 45,
                            font: {
                                size: 11,
                                family: 'Oswald, sans-serif',
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: theme.gridColor,
                        },
                        ticks: {
                            color: theme.textColor,
                            font: {
                                size: 11,
                                family: 'Oswald, sans-serif',
                            },
                            callback: function (value) {
                                return formatBRL(value);
                            },
                        },
                    },
                },
            },
        });
    }

    function updateDashboard() {
        if (!timelineChart) return;
        const filtered = getFilteredData();
        timelineChart.data.labels = filtered.labels;
        timelineChart.data.datasets = buildDatasets(filtered);
        timelineChart.update();
        syncCardsAndDonut(filtered);
    }

    // Initialize Donut Chart
    const donutCtx = document.getElementById('dashboardDonutChart');
    if (donutCtx) {
        const distData = dashboardData.distribution || {};
        const donutLabels = distData.labels || ['Entradas', 'Saídas'];
        const donutColors = distData.colors || ['#10b981', '#ef4444'];
        const initialValues = distData.values || [0, 0];
        const theme = getThemeColors();

        donutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: donutLabels,
                datasets: [{
                    data: initialValues,
                    backgroundColor: donutColors,
                    borderColor: theme.donutBorder,
                    borderWidth: 2,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '66%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            padding: 12,
                            font: {
                                size: 12,
                                family: 'Oswald, sans-serif',
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const val = context.parsed;
                                const perc = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                                if (currentDonutMetric === 'values') {
                                    return ` ${context.label}: ${formatBRL(val)} (${perc}%)`;
                                }
                                return ` ${context.label}: ${val} lançamento(s) (${perc}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    // View switch: Mensal vs Diário
    const viewPills = document.querySelectorAll('.view-pill');
    const monthlyPeriodGroup = document.getElementById('monthly-period-group');
    const dailyPeriodGroup = document.getElementById('daily-period-group');

    viewPills.forEach(pill => {
        pill.addEventListener('click', function () {
            viewPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentView = this.getAttribute('data-view');

            if (currentView === 'daily') {
                if (monthlyPeriodGroup) monthlyPeriodGroup.classList.add('d-none');
                if (dailyPeriodGroup) dailyPeriodGroup.classList.remove('d-none');
            } else {
                if (monthlyPeriodGroup) monthlyPeriodGroup.classList.remove('d-none');
                if (dailyPeriodGroup) dailyPeriodGroup.classList.add('d-none');
            }

            updateDashboard();
        });
    });

    // Chart Type switch: Barras vs Linhas
    const typePills = document.querySelectorAll('.type-pill');
    typePills.forEach(pill => {
        pill.addEventListener('click', function () {
            typePills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentChartType = this.getAttribute('data-chart-type');
            updateDashboard();
        });
    });

    // Monthly Period switch (6m, 12m, all)
    const periodPills = document.querySelectorAll('.period-pill');
    periodPills.forEach(pill => {
        pill.addEventListener('click', function () {
            periodPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentMonthlyPeriod = this.getAttribute('data-period');
            updateDashboard();
        });
    });

    // Daily Period switch (7d, 30d, 90d)
    const dailyPeriodPills = document.querySelectorAll('.daily-period-pill');
    dailyPeriodPills.forEach(pill => {
        pill.addEventListener('click', function () {
            dailyPeriodPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentDailyPeriod = this.getAttribute('data-daily-period');
            updateDashboard();
        });
    });

    // Donut metric switch (Valores vs Quantidade)
    const donutPills = document.querySelectorAll('.donut-pill');
    donutPills.forEach(pill => {
        pill.addEventListener('click', function () {
            donutPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentDonutMetric = this.getAttribute('data-donut-metric');
            syncCardsAndDonut(getFilteredData());
        });
    });

    // Dark mode live reactivity
    const darkToggle = document.getElementById('darkmode-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', function () {
            setTimeout(function () {
                const theme = getThemeColors();
                if (timelineChart) {
                    timelineChart.options.plugins.legend.labels.color = theme.textColor;
                    timelineChart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
                    timelineChart.options.scales.x.grid.color = theme.gridColor;
                    timelineChart.options.scales.x.ticks.color = theme.textColor;
                    timelineChart.options.scales.y.grid.color = theme.gridColor;
                    timelineChart.options.scales.y.ticks.color = theme.textColor;
                    timelineChart.update();
                }
                if (donutChart) {
                    donutChart.data.datasets[0].borderColor = theme.donutBorder;
                    donutChart.options.plugins.legend.labels.color = theme.textColor;
                    donutChart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
                    donutChart.update();
                }
            }, 50);
        });
    }
});
