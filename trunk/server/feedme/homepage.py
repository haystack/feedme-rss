from django.shortcuts import render_to_response
from models import *
import codecs, sys
import versionutils

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

def homepage(request):
    return render_to_response('index.html',
                            {'feedme_url' : versionutils.latest_url(), 'user': request.user})
