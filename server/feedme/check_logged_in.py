from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *

def check_logged_in(request):
    response = dict()
    response['logged_in'] = request.user.is_authenticated()
    response['user_interface'] = True
    response['social_features'] = True

    response_json = simplejson.dumps(response)

    if response['logged_in']:
        # logging
        sharer = Sharer.objects.get(user = request.user)
        log = LoggedIn(sharer = sharer)
        log.save()

        # personalized UI
        try:
            sharer = Sharer.objects.get(user = request.user)
            study_participant = StudyParticipant.objects.get(sharer = sharer)
            response['user_interface'] = study_participant.user_interface
            response['social_features'] = study_participant.social_features
        except StudyParticipant.DoesNotExist:
            print 'not a study participant'
    
        

    return HttpResponse(response_json, mimetype='application/json')
