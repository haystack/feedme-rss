from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.db import transaction
from django.forms.fields import email_re
import math
import operator
import datetime
import time
from django.core.cache import cache
from django.shortcuts import render_to_response

def robots(request):
  return render_to_response('robots.txt', mimetype='text/plain')
