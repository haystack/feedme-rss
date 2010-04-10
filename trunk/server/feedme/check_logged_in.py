from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *


def check_logged_in_jsonp(request):
  response = check_logged_in_impl(request)
  response = "%s(%s);" % (request.REQUEST['callback'], response)
  return HttpResponse(response, \
                      mimetype='application/json')

def check_logged_in(request):
    return HttpResponse(check_logged_in_impl(request), mimetype='application/json')

def check_logged_in_impl(request):
    response = dict()
    response['logged_in'] = request.user.is_authenticated()
    response['user_interface'] = True
    response['social_features'] = True

    if response['logged_in']:
        try:
            sharer = Sharer.objects.get(user = request.user)
        except Sharer.DoesNotExist:
            sharer = Sharer(user = request.user)
            sharer.save()

        log = LoggedIn(sharer = sharer)
        log.save()

        try:
            # personalized UI
            study_participant = StudyParticipant.objects.get(sharer = sharer)
            response['user_interface'] = study_participant.user_interface
            response['social_features'] = study_participant.social_features
        except StudyParticipant.DoesNotExist:
            print 'not a study participant'
            
    response_json = simplejson.dumps(response)
    return response_json
