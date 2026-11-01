<h1 align="center">
    <img alt="Django Payments" title="Django Payments" src="./setup/static/images/favicon.png" width="50px" />
</h1>

<h4 align="center">
	💰 Django Payments - Fluxo de Caixa com Dashboard
</h4>

---

Sistema web para controle de **Fluxo de Caixa (Entradas e Saídas)** com um **Dashboard Analítico** integrado diretamente ao painel administrativo do Django.

---

## ✨ Funcionalidades

- **Gestão de Movimentações Financeiras (`Entradas` e `Saídas`)**:
  - Registro de lançamentos com data, tipo (`Entrada` ou `Saída`), valor em reais (`R$`), observação e usuário responsável.
  - Listagem administrativa com hierarquia de datas, filtros por período e tipo, busca por observação e indicadores visuais coloridos.
- **Dashboard Analítico Integrado ao Admin (`/admin/`)**:
  - **Cards de Resumo (KPIs)**:
    - **Total de Entradas**: soma das receitas, quantidade de lançamentos e acumulado do mês atual.
    - **Total de Saídas**: soma das despesas, quantidade de lançamentos e acumulado do mês atual.
    - **Saldo em Caixa**: resultado líquido (`Entradas - Saídas`), indicador visual de status (`Saldo Positivo` / `Saldo Negativo`) e percentual de margem líquida.
    - **Balanço do Mês**: resultado líquido e volume de movimentações do mês vigente.
  - **Gráfico de Evolução (Entradas vs Saídas + Saldo Líquido)**:
    - Alternância entre visualização **Mensal** (`6 Meses`, `12 Meses`, `Todos`) e **Diária** (`7 Dias`, `30 Dias`, `90 Dias`).
    - Alternância entre gráfico de **Barras** e **Linhas**.
    - Atualização dinâmica dos cards e indicadores conforme o período filtrado.
  - **Gráfico de Proporção Financeira (Rosca)**:
    - Comparativo proporcional entre Entradas e Saídas por **Valor (`R$`)** ou **Quantidade de lançamentos**, acompanhado do **Ticket Médio** de entrada e de saída.
  - **Últimas Movimentações**:
    - Tabela de acesso rápido com os lançamentos mais recentes e atalhos para criação e edição.
- **Interface Moderna**:
  - Customização com **Django Jazzmin** (AdminLTE 3 / Bootstrap) e suporte a **Modo Escuro (Dark Mode)**.

---

## 🛠️ Tecnologias Utilizadas

- **Python 3.10+**
- **Django 5.1**
- **Django Jazzmin** (Tema e UI do Admin)
- **Chart.js** (Gráficos interativos do Dashboard)
- **SQLite / PostgreSQL** (Banco de dados)
- **Ruff & Mypy** (Padronização de código, lint e checagem de tipos)

---

## 🚀 Como Executar o Projeto

### 1. Configurar o ambiente virtual e instalar dependências

```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
# ou: venv\Scripts\activate (Windows)

pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SECRET_KEY="sua-chave-secreta"
DEBUG=true
ALLOWED_HOSTS=["*"]
```

### 3. Executar as migrações e criar um superusuário

```bash
python manage.py migrate
python manage.py createsuperuser
```

*(Opcional)* Para popular o banco com dados de teste:

```bash
python manage.py create_payments
```

### 4. Iniciar o servidor

```bash
python manage.py runserver
```

Acesse o painel e o dashboard em: `http://127.0.0.1:8000/admin/`

---

## ⚡ Comandos Úteis (`Makefile`)

- `make run` — Inicia o servidor de desenvolvimento
- `make migrations` — Cria novas migrações
- `make migrate` — Aplica as migrações no banco de dados
- `make superuser` — Cria um superusuário
- `make lint` — Executa verificação de código com Ruff
- `make format` — Formata o código com Ruff
- `make typecheck` — Executa verificação de tipos com Mypy

