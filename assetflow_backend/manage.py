#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

def main():
    """Run administrative tasks."""
    # ----------------------------------------------------------------------
    # SOLUCIÓN DEFINITIVA: Añadir el directorio padre al Python Path
    # Esto garantiza que el módulo 'assetflow_backend' sea visible.
    # Si manage.py está en /app/assetflow_backend/, esto añade /app/ al path.
    # ----------------------------------------------------------------------
    if os.environ.get('RAILWAY_ENVIRONMENT'):
        # Solo en Railway (o si estás seguro de que la estructura es /app/assetflow_backend)
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))
        
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'assetflow_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()