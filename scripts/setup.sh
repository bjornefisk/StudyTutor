#!/usr/bin/env bash
set -euo pipefail

# Portable project setup script
# - Creates a Python venv in .venv
# - Installs requirements
# - Creates .env from .env-EXAMPLE if missing
# - Optionally prompts to set OPENROUTER_API_KEY

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

info() { printf "\033[1;34m[i]\033[0m %s\n" "$*"; }
success() { printf "\033[1;32m[✓]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[!]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[x]\033[0m %s\n" "$*"; }

PYTHON_BIN=${PYTHON_BIN:-python3}
VENV_DIR=${VENV_DIR:-.venv}

info "Using python: $($PYTHON_BIN -V 2>/dev/null || echo 'python3 (version unknown)')"

if [ ! -d "$VENV_DIR" ]; then
  info "Creating virtual environment in $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  info "Virtual environment already exists: $VENV_DIR"
fi

# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"
success "Activated venv: $VENV_DIR"

info "Upgrading pip and installing requirements"
python -m pip install --upgrade pip
pip install -r requirements.txt
success "Dependencies installed"

if [ ! -f .env ]; then
  if [ -f .env-EXAMPLE ]; then
    info "Creating .env from .env-EXAMPLE"
    cp .env-EXAMPLE .env
  else
    warn ".env-EXAMPLE not found; creating minimal .env"
    cat > .env <<'EOF'
EMBEDDINGS_BACKEND=sbert
LLM_BACKEND=openrouter
OPENROUTER_API_KEY=
EOF
  fi
else
  info ".env already exists; leaving it as-is"
fi

# Prompt for OpenRouter key unless suppressed
if [ "${SETUP_NONINTERACTIVE:-}" != "1" ]; then
  if ! grep -q '^OPENROUTER_API_KEY=' .env; then
    echo 'OPENROUTER_API_KEY=' >> .env
  fi
  current_key=$(grep '^OPENROUTER_API_KEY=' .env | head -n1 | cut -d'=' -f2-)
  if [ -z "$current_key" ] || [[ "$current_key" == "<YOUR_OPENROUTER_API_KEY>" ]]; then
    echo
    read -r -p "Enter your OpenRouter API key (leave blank to skip): " key_input || true
    if [ -n "$key_input" ]; then
      # Escape slashes for sed
      esc_key=$(printf '%s' "$key_input" | sed -e 's/[\&/]/\\&/g')
      if grep -q '^OPENROUTER_API_KEY=' .env; then
        sed -i.bak "s/^OPENROUTER_API_KEY=.*/OPENROUTER_API_KEY=$esc_key/" .env && rm -f .env.bak
      else
        echo "OPENROUTER_API_KEY=$esc_key" >> .env
      fi
      success "Saved OPENROUTER_API_KEY to .env"
    else
      warn "Skipped setting OPENROUTER_API_KEY; hosted backends will not work until you add it."
    fi
  fi
fi

success "Setup complete. Next steps:"
echo "  1) Put your PDFs/DOCX/TXT/MD into data/"
echo "  2) Run: source $VENV_DIR/bin/activate"
echo "  3) Run: python ingest.py"
echo "  4) Run: streamlit run app.py"
