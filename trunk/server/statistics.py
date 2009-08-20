from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
from django.db.models import F

def generate_statistics(sharers, start_time, end_time):
    """Returns a dictionary of useful statistics for the sharers"""
    stats = dict()

    # unique sharing events
    # TODO: Add this in once we have an end_time.
    # sharedpostreceiver__time__lte = F('sharer__studyparticipant__studyparticipantassignment__end_time'),
    # TODO: handle what happens when users switch to second half of study
    newposts = SharedPost.objects \
               .filter(
                 sharedpostreceiver__time__gte = start_time,
                 sharedpostreceiver__time__lt = end_time,
                 sharer__in = sharers
               ).filter(
                 sharedpostreceiver__time__gte = F('sharer__studyparticipant__studyparticipantassignment__start_time')
               ).distinct()
    stats['shared_posts'] = newposts.count()

    # emails with clickthroughs
    clicked = newposts.all() \
              .filter(clickthroughs__gte = 1)
    stats['clickthroughs'] = clicked.count()

    # emails with thanks
    thanked = newposts.all() \
              .filter(thanks__gte = 1)
    stats['thanks'] = thanked.count()

    # unique number of people shared with
    unique_recipients = Receiver.objects \
              .filter(sharedpostreceiver__shared_post__in = newposts.all()) \
              .distinct()
    stats['unique_recipients'] = unique_recipients.count()

    # times GReader loaded in browser
    logins = LoggedIn.objects.filter(time__gte = start_time,
                                     time__lt = end_time,
                                     sharer__in = sharers)
    stats['logins'] = logins.count()

    # number of posts viewed
    viewed = ViewedPost.objects.filter(time__gte = start_time,
                                       time__lte = end_time,
                                       sharer__in =  sharers)
    stats['viewed'] = viewed.count()

    # number of viewed posts with a link clicked in the greader interface
    greader_clicked = viewed.all().filter(link_clickthrough = True)
    stats['greader_clicked'] = clicked.count()

    return stats

def since(mode, num_days):
    sinceday = datetime.datetime.now() - datetime.timedelta(days = num_days)
    now = datetime.datetime.now()

    print "Printing %s report since %d ago" % (mode, num_days)

    if (mode == "usersummary"):
        usersummary(sinceday, now)
    elif (mode == "groupsummary"):
        groupsummary(sinceday, now)
    else:
        print "Mode must be one of 'usersummary' or 'groupsummary'."

def usersummary(sinceday, now):
    sharers = [sp.sharer for sp in StudyParticipant.objects.all()]
    for sharer in sharers:
        stats = generate_statistics([sharer], sinceday, now)
        print sharer
        print stats

def groupsummary(sinceday, now):
    admins = ['msbernst@mit.edu', 'marcua@csail.mit.edu',
              'karger@csail.mit.edu']

    for i in range(4):
        user_interface = (i <= 1)
        social_features = ( i % 2 == 0 )
        print 'user interface: ' + str(user_interface)
        print 'social features: ' + str(social_features)
        sharers = Sharer.objects \
                  .filter(studyparticipant__user_interface = user_interface,
                          studyparticipant__social_features = social_features)\
                  .exclude(user__email__in = admins)
        stats = generate_statistics(sharers, sinceday, now)
        print "For %d members:" % (sharers.count())
        avg_stats(stats, sharers)
        print stats

def avg_stats(stats, sharers):
    count = sharers.count()
    count *= 1.0
    stats['shared_posts'] /= count
    stats['clickthroughs'] /= count
    stats['thanks'] /= count
    stats['unique_recipients'] /= count
    stats['logins'] /= count
    stats['viewed'] /= count
    stats['greader_clicked'] /= count


if __name__ == "__main__":
    if len(sys.argv) == 3:
        mode = str(sys.argv[1])
        days = int(sys.argv[2])
        since(mode, days)
    else:
        print "Arguments: [usersummary|groupsummary] num-days"
