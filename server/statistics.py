from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime

def generate_statistics(sharers, start_time, end_time):
    """Returns a dictionary of useful statistics for the sharers"""
    stats = dict()

    # unique sharing events
    newposts = SharedPost.objects \
               .filter(sharedpostreceiver__time__gte = start_time,
                       sharedpostreceiver__time__lt = end_time,
                       sharer__in = sharers) \
               .distinct()
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

if __name__ == "__main__":
    yesterday = datetime.datetime.now() - datetime.timedelta(days = 1)
    now = datetime.datetime.now()
    admins = ['msbernst@mit.edu', 'marcua@csail.mit.edu',
              'karger@csail.mit.edu']

    for sharer in Sharer.objects.all():
        stats = generate_statistics([sharer], yesterday, now)
        print sharer
        print stats

    print
    print
    print

    for i in range(4):
        user_interface = (i <= 1)
        social_features = ( i % 2 == 0 )
        print 'user interface: ' + str(user_interface)
        print 'social features: ' + str(social_features)
        sharers = Sharer.objects \
                  .filter(studyparticipant__user_interface = user_interface,
                          studyparticipant__social_features = social_features)\
                  .exclude(user__email__in = admins)
        stats = generate_statistics(sharers, yesterday, now)
        print stats
        
