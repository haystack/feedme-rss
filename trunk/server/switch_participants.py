from django.core.management import setup_environ
import settings
setup_environ(settings)
import datetime
import participant_info
from django.db import transaction
from server.feedme.models import *
import traceback

@transaction.commit_manually
def switch_participants():
  try:
      emails = participant_info.people
      print emails
      for email in emails:
          sharer = Sharer.objects.get(user__email = email)
          sp = StudyParticipant.objects.get(sharer = sharer)
          assignments = StudyParticipantAssignment.objects \
              .filter(study_participant = sp)
          num_assignments = assignments.count()
          if num_assignments > 1:
              print "%s has %d assignments, not processing more" \
                  % (email, num_assignments)
              continue
          print "%s has at most one assignment---switching assignment" % (email)

          # end the user's current assignment by setting its end_date
          if num_assignments == 1:
              print "---changed end time of the current study"
              assignment = assignments.get(study_participant = sp)
              assignment.end_time = datetime.datetime.now()
              assignment.save()
          # switch the user's UI configuration
          sp.user_interface = not sp.user_interface
          sp.save()
          print "---group is %s, new ui setting is %s" \
              % (sp.study_group, str(sp.user_interface))

          # add a new assignment entry starting now
          spa = StudyParticipantAssignment(study_participant = sp, user_interface = sp.user_interface, social_features = sp.social_features, start_time = datetime.datetime.now(), end_time = datetime.datetime(2009, 9, 1))
          print "---adding assignment: %s" % (unicode(spa))
          spa.save()
  except Exception, ex:
    traceback.print_exc()
    transaction.rollback()
  else:
    transaction.commit()

if __name__ == '__main__':
    switch_participants()
