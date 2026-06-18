.DEFAULT_GOAL := help
VENV := .venv
PY := $(VENV)/bin/python
PYTEST := $(VENV)/bin/pytest

.PHONY: help install test test-headed test-debug clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Create venv, install test deps + Chromium
	python3 -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -r requirements-dev.txt
	$(PY) -m playwright install chromium

test: ## Run the e2e test suite (headless)
	$(PYTEST) tests/ -q

test-headed: ## Run tests with a visible browser
	$(PYTEST) tests/ --headed

test-debug: ## Run tests with Playwright inspector
	PWDEBUG=1 $(PYTEST) tests/ -s

clean: ## Remove venv and pytest caches
	rm -rf $(VENV) .pytest_cache tests/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
