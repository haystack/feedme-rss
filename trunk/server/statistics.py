from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
import numpy
from django.db.models import F

# We don't want to show up in statistics
admins = ['msbernst@mit.edu', 'marcua@csail.mit.edu',
          'karger@csail.mit.edu']

def generate_statistics(sharers, start_time, end_time):
    """Returns a dictionary of useful statistics for the sharers"""
    stats = dict()

    # unique sharing events
    newposts = SharedPost.objects \
               .filter(
                 sharedpostreceiver__time__gte = start_time,
                 sharedpostreceiver__time__lt = end_time,
                 sharer__in = sharers
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
    
    # total number of people (not unique) shared with
    recipients = Receiver.objects \
              .filter(sharedpostreceiver__shared_post__in = newposts.all())
    stats['recipients'] = recipients.count()

    # unique number of people shared with
    unique_recipients = Receiver.objects \
              .filter(sharedpostreceiver__shared_post__in = newposts.all()) \
              .distinct()
    stats['unique_recipients'] = unique_recipients.count()

    # times GReader loaded in browser
    logins = LoggedIn.objects \
      .filter(
              time__gte = start_time,
              time__lt = end_time,
              sharer__in = sharers
             ).distinct()
    stats['logins'] = logins.count()

    # number of posts viewed
    viewed = ViewedPost.objects \
        .filter(
                time__gte = start_time,
                time__lte = end_time,
                sharer__in =  sharers
               ).distinct()
    stats['viewed'] = viewed.count()

    # number of viewed posts with a link clicked in the greader interface
    greader_clicked = viewed.all().filter(link_clickthrough = True)
    stats['greader_clicked'] = greader_clicked.count()

    return stats

def userstatssince(numdays):
    sinceday = datetime.datetime.now() - datetime.timedelta(days = numdays)
    now = datetime.datetime.now()
    participants = StudyParticipant.objects \
                    .exclude(sharer__user__email__in = admins)
    sharers = [sp.sharer for sp in participants]
    first = True
    keys = dict()
    for sharer in sharers:
        stats = generate_statistics([sharer], sinceday, now)
        if first:
            keys = stats.keys()
            print "name, email, study group, ui on, social on, %s" % (", ".join(keys))
            first = False
        name = sharer.name()
        email = sharer.user.email
        participant = StudyParticipant.objects.get(sharer = sharer)
        study_group = participant.study_group
        ui = (participant.user_interface == 1)
        social = (participant.social_features == 1)
        stats_str = ", ".join([str(stats[key]) for key in keys])
        print ("%s, %s, %s, %s, %s, %s" % (name, email, study_group, str(ui), str(social), stats_str)).encode('ascii', 'backslashreplace')

def userstats():
    participants = StudyParticipant.objects \
                    .exclude(sharer__user__email__in = admins)
    first = True
    keys = dict()
    norm_keys = dict()
    for participant in participants: 
        sharer = participant.sharer
        spas = StudyParticipantAssignment.objects \
            .filter(study_participant = participant)
        spaslist = [spa for spa in spas]
        spaslist.sort(lambda x,y: cmp(x.start_time, y.start_time))
        for (order, spa) in enumerate(spaslist):
            stats = generate_statistics([sharer], spa.start_time, spa.end_time)
            normalized = normalize(stats, "viewed")
            # pk, ui on---assign, social on---assign, order, date_started,
            # date_ended
            if first:
                keys = stats.keys()
                norm_keys = normalized.keys()
                print "pk, name, email, study_group, ui_on, social_on, order, date_started, date_ended, %s, %s" % (", ".join(keys), ",".join(norm_keys))
                first = False
            pk = sharer.user.pk
            name = sharer.name()
            email = sharer.user.email
            participant = StudyParticipant.objects.get(sharer = sharer)
            study_group = participant.study_group
            ui = (spa.user_interface == 1)
            social = (spa.social_features == 1)
            date_started = spa.start_time
            date_ended = spa.end_time
            stats_str = ", ".join([str(stats[key]) for key in keys])
            norm_stats_str = ", ".join([str(normalized[key]) for key in norm_keys])
            print ("%d, %s, %s, %s, %s, %s, %d, %s, %s, %s, %s" % (pk, name, email, study_group, str(ui), str(social), order+1, date_started, date_ended, stats_str, norm_stats_str)).encode('ascii', 'backslashreplace')

def normalize(to_norm, norm_key):
    normalized = dict()
    norm_val = to_norm[norm_key] * 1.0
    for k, v in to_norm.items():
        new_key = "%s_div_%s" % (k, norm_key)
        if norm_val != 0:
            normalized[new_key] = to_norm[k]/norm_val
        else:
            normalized[new_key] = 'divby0'
    return normalized

if __name__ == "__main__":
    num_args = len(sys.argv)
    if (num_args == 3) and (sys.argv[1] == 'user-stats-since'):
        userstatssince(int(sys.argv[2]))
    elif (len(sys.argv) == 2) and (sys.argv[1] == 'user-stats'):
        userstats()
    else:
        print "Arguments: [user-stats|user-stats-since num-days]"
