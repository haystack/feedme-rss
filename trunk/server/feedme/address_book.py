from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required

@login_required
def address_book(request):

    receivers = Receiver.objects.filter(
        sharedpostreceiver__shared_post__sharer__user = request.user) \
        .distinct()
    response = [ { 'email': receiver.user.email } for receiver in receivers ]
    response_json = simplejson.dumps(response)

    return HttpResponse(response_json, mimetype='application/json')
