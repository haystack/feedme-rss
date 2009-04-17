# Django settings for server project.
import os.path
from private_settings import *

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Fwd team', 'fwd@csail.mit.edu'),
)

MANAGERS = ADMINS

# Database info is in private_settings.py

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

# Our sessions last 8 weeks
SESSION_COOKIE_AGE = 4838400

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = ''

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/'

# Secret key is in private_settings.py

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
#     'django.template.loaders.eggs.load_template_source',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

ROOT_URLCONF = 'server.urls'

# Template_Dirs is in private_settings.py

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.admin',
    #'django.contrib.admindocs',
    'server.fwd',
    'registration',
    'email_usernames'
)

AUTHENTICATION_BACKENDS = (
    # Our custom auth backend that allows email addresses to be used as
    # usernames.
    'email_usernames.backends.EmailOrUsernameModelBackend', 
    # Default auth backend that handles everything else.
    'django.contrib.auth.backends.ModelBackend', 
)

# app-specific settings
ACCOUNT_ACTIVATION_DAYS = 7
REGISTER_COMPLETE_URL = '/accounts/register/complete/'
LOGIN_REDIRECT_URL = '/accounts/login/complete/'
