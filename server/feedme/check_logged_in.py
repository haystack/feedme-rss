from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *

def check_logged_in(request):
    response = dict()
    response['logged_in'] = request.user.is_authenticated()
    response_json = simplejson.dumps(response)

    if response['logged_in']:
        # logging
        sharer = Sharer.objects.get(user = request.user)
        log = LoggedIn(sharer = sharer)
        log.save()        

    return HttpResponse(response_json, mimetype='application/json')
