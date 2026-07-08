.DEFAULT_GOAL := help
VENV := .venv
PY := $(VENV)/bin/python
PYTEST := $(VENV)/bin/pytest
PRECOMMIT := $(VENV)/bin/pre-commit

.PHONY: help install test test-smoke test-headed test-debug precommit precommit-ci clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Create venv, install test deps + Chromium
	python3 -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -r requirements-dev.txt
	$(PY) -m playwright install chromium
	$(PRECOMMIT) install
	@command -v lychee >/dev/null 2>&1 || echo "⚠️  lychee not found - run: brew install lychee (needed for dead-link pre-commit hook)"

precommit: ## Run all pre-commit hooks against all files (auto-fixes in place)
	$(PRECOMMIT) run --all-files

precommit-ci: ## Run the CI gate locally (check-only, never writes; mirrors CI)
	$(PRECOMMIT) run --all-files --config .pre-commit-config.ci.yaml

test-verbose: ## Run the e2e test suite (headless)
	$(PYTEST) tests/ -v

test: ## Run the e2e test suite (headless)
	$(PYTEST) tests/ -q

test-smoke: ## Run smoke subset only (fast dev-loop)
	$(PYTEST) tests/ -q -m smoke

test-parallel: ## Run tests in parallel (N=<number of processes>, default: auto)
	$(PYTEST) tests/ -q -n $${N:-auto}

test-headed: ## Run tests with a visible browser
	$(PYTEST) tests/ --headed

test-debug: ## Run tests with Playwright inspector
	PWDEBUG=1 $(PYTEST) tests/ -s

clean: ## Remove venv and pytest caches
	rm -rf $(VENV) .pytest_cache tests/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
