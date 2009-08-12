import os

DATABASE_ENGINE = ''           # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
DATABASE_NAME = ''             # Or path to database file if using sqlite3.
DATABASE_USER = ''             # Not used with sqlite3.
DATABASE_PASSWORD = ''         # Not used with sqlite3.
DATABASE_HOST = ''             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.
DATABASE_OPTIONS = {}          # Set to empty dictionary for default.

# Host for sending e-mail.
EMAIL_HOST = 'localhost'
# Port for sending e-mail.
EMAIL_PORT = 25

SECRET_KEY = ''

TEMPLATE_DIRS = ()

DEBUG = # True or False
TEMPLATE_DEBUG = DEBUG # Or override this

os.environ['PYTHON_EGG_CACHE'] = '/absolute/path/to/a/writable/directory/.python-eggs'
