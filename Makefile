.ONESHELL:
SHELL=/bin/bash

ifeq ($(OS),Windows_NT)
    VENV_PATH := ./venv/Scripts
else
    VENV_PATH := ./venv/bin
endif

migrations:
	$(VENV_PATH)/python ./manage.py makemigrations

migrate:
	$(VENV_PATH)/python ./manage.py migrate

pip:
	$(VENV_PATH)/pip install -r requirements.txt

run:
	$(VENV_PATH)/python ./manage.py runserver

run-ip:
	$(VENV_PATH)/python ./manage.py runserver 

shell:
	$(VENV_PATH)/python ./manage.py shell

superuser:
	$(VENV_PATH)/python ./manage.py createsuperuser

messages:
	$(VENV_PATH)/python ./manage.py makemessages -l 'pt_BR'

compilemessages:
	$(VENV_PATH)/python ./manage.py compilemessages

test:
	$(VENV_PATH)/python ./manage.py test bt_league cup futevolei


# ── Code Quality ─────────────────────────────────────────────────────────────
lint:
	$(VENV_PATH)/ruff check .

lint-fix:
	$(VENV_PATH)/ruff check --fix .

format:
	$(VENV_PATH)/ruff format .

typecheck:
	$(VENV_PATH)/mypy apps/ setup/ utils/

commit-lint:
	npx commitlint --from HEAD~1 --to HEAD --verbose

check-all: lint commit-lint