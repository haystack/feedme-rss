from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
from copy import deepcopy
import numpy
from django.db.models import F
from datetime import datetime, timedelta

def summarize_user(study_participant):
    print study_participant.sharer.user.email + ' --------------------------'
    spas = StudyParticipantAssignment.objects \
        .filter(study_participant = study_participant) \
        .order_by('start_time')

    for spa in spas:
        start_midnight = datetime(day = spa.start_time.day,
                                  month = spa.start_time.month,
                                  year = spa.start_time.year)
        start_midnight += timedelta(days = 1)


        date_points = [ spa.start_time ]

        date_cursor = deepcopy(start_midnight)
        while(date_cursor < spa.end_time):
            date_points.append(deepcopy(date_cursor))
            date_cursor += timedelta(days = 1)
        date_points.append(spa.end_time)
        print date_points

        for i in range(len(date_points)-1):
            start_iter = date_points[i]
            end_iter = date_points[i+1]
            vps = ViewedPost.objects \
                  .filter(sharer = study_participant.sharer,
                          time__gte = start_iter,
                          time__lt = end_iter)
            print str(vps.count()) + ' ViewedPosts\t' + str(start_iter) + ' to ' + str(end_iter)
        
        
if __name__ == '__main__':
    sp = StudyParticipant.objects.get(sharer__user__email = 'msbernst@mit.edu')
    summarize_user(sp)
        
