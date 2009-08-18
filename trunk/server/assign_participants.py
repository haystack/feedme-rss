from django.core.management import setup_environ
import settings
setup_environ(settings)
import datetime
import participant_info
from django.db import transaction
from server.feedme.models import *

@transaction.commit_manually
def create_participants():
  participants = zip(participant_info.people, participant_info.groups)
  for person, group in participants:
    print u"saving " + person
    sharer = Sharer.objects.get(user__email = person)
    sp = StudyParticipant(sharer = sharer, study_group = group)
    sp.save()

    user_interface = True
    social_features = True
    if 'noui' in group:
      user_interface = False
    if 'nosocial' in group:
      social_features = False        
    spa = StudyParticipantAssignment(study_participant = sp, user_interface = user_interface, social_features = social_features, start_time = datetime.datetime.now(), end_time = datetime.datetime.now())

    sp.user_interface = spa.user_interface
    sp.social_features = spa.social_features

    sp.save()
    spa.save()
  transaction.commit()

try:
  create_participants()
except Exception:
  transaction.rollback()
