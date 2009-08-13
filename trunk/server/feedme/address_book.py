from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required

def address_book(request):
   if request.user.is_authenticated:
       receivers = Receiver.objects.filter(
           sharedpostreceiver__shared_post__sharer__user = request.user) \
           .distinct()
       response = [ { 'email': receiver.user.email } for receiver in receivers ]
   else:
       response = []
   response_json = simplejson.dumps(response)

   return HttpResponse(response_json, mimetype='application/json')
