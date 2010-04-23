from django.shortcuts import render_to_response
from models import *
import codecs, sys

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

def bar(request):
    return render_to_response('bar.html')
