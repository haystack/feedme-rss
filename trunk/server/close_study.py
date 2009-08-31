from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
import numpy
import participant_info
from django.db import transaction

@transaction.commit_on_success
def close_participants(study_participants):
    """Sets now to be the study assignment end time, and puts them in UI/social condition"""
    for study_participant in study_participants:
        close_participant(study_participant)

def close_participant(study_participant):
    all_assignments = StudyParticipantAssignment.objects.filter(study_participant = study_participant)
    if all_assignments.count() != 2:
        print (str(study_participant) + ' does not have two study assignments. skipping.') \
        .encode('ascii', 'backslashreplace')
        return

    print ('closing study for ' + str(study_participant)).encode('ascii', 'backslashreplace')

    current_assignment = all_assignments.order_by('-start_time')[0]
    current_assignment.end_time = datetime.datetime.now()
    current_assignment.save()

    study_participant.user_interface = True
    study_participant.social_features = True
    study_participant.save()

if __name__ == "__main__":
    user_emails = participant_info.people
    study_participants = set()
    for user_email in user_emails:
        try:
            participant = StudyParticipant.objects.get(sharer__user__email = user_email)
            study_participants.add(participant)
        except StudyParticipant.DoesNotExist:
            print 'No study participant with e-mail ' + user_email

        close_participants(study_participants)
