# Per reviewer's request, calculate the % of shares that were
# to someone using FeedMe
from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
import numpy
from django.db.models import F
from datetime import timedelta
from statistics import admins

participants = StudyParticipant.objects \
               .exclude(sharer__user__email__in = admins)

def stats_recipients():
    total_shared = 0
    total_shared_with_user = 0
    for participant in participants:
        spas = StudyParticipantAssignment.objects \
               .filter(study_participant = participant) \
               .order_by("start_time")

        for (order, spa) in enumerate(spas):
            (shared, shared_with_user) = count_shares(spa)
            print (shared, shared_with_user)
            total_shared = total_shared + shared
            total_shared_with_user = total_shared_with_user + shared_with_user

    print '\n\n\n'
    print str(total_shared) + ' items shared total'
    print str(total_shared_with_user) + ' items shared with a FeedMe user'
    print str(float(total_shared_with_user) / total_shared)

def count_shares(spa):
    receivers = Receiver.objects \
                .filter(sharedpostreceiver__shared_post__sharer = \
                        spa.study_participant.sharer,
                        sharedpostreceiver__time__gt = spa.start_time,
                        sharedpostreceiver__time__lte = spa.end_time)
    print receivers

    receiver_users = receivers.filter( \
        user__in = [p.sharer.user for p in participants])
    print receiver_users
    return (receivers.count(), receiver_users.count())

if __name__ == "__main__":
    stats_recipients()

