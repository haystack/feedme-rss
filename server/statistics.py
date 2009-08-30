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

def userstatssince(numdays, participants = StudyParticipant.objects.
                   exclude(sharer__user__email__in = admins)):
    sinceday = datetime.datetime.now() - datetime.timedelta(days = numdays)
    now = datetime.datetime.now()
    sharers = [sp.sharer for sp in participants]
    first = True
    keys = dict()
    for sharer in sharers:
        stats = generate_statistics([sharer], sinceday, now)
        if first:
            keys = stats.keys()
            print "name,email,study_group,ui_on,social_on,%s" % (",".join(keys))
            first = False
        name = sharer.name()
        email = sharer.user.email
        participant = StudyParticipant.objects.get(sharer = sharer)
        study_group = participant.study_group
        ui = (participant.user_interface == 1)
        social = (participant.social_features == 1)
        stats_str = ",".join([str(stats[key]) for key in keys])
        print ("%s,%s,%s,%s,%s,%s" % (name, email, study_group, str(ui), str(social), stats_str)).encode('ascii', 'backslashreplace')

def userstats(participants = StudyParticipant.objects
              .exclude(sharer__user__email__in = admins)):
    first = True
    (assign_keys, ui_keys, noui_keys, ui_norm_keys, noui_norm_keys) = ([], [], [], [], [])
    for participant in participants:
        keyreport = dict()
        spas = StudyParticipantAssignment.objects \
               .filter(study_participant = participant) \
               .order_by("start_time")
        
        for (order, spa) in enumerate(spas):
            stats = generate_statistics([participant.sharer], spa.start_time, spa.end_time)
            normalized = normalize(stats, "viewed")
            if first:
                (assign_keys, ui_keys, noui_keys, ui_norm_keys, noui_norm_keys) = \
                    userstats_first(stats, normalized)
                first = False
            keyreport = userstats_updateassignments(spa, order, keyreport)
            keyreport = userstats_updatereport(spa.user_interface, keyreport, stats)
            keyreport = userstats_updatereport(spa.user_interface, keyreport, normalized)

        userstats_printreport(participant, keyreport, \
            [assign_keys, ui_keys, noui_keys, ui_norm_keys, noui_norm_keys])

def userstats_printreport(participant, report, key_lists):
    """ Prints a participant row """
    sharer = participant.sharer
    pk = sharer.user.pk
    name = sharer.name()
    email = sharer.user.email
    participant = StudyParticipant.objects.get(sharer = sharer)
    study_group = participant.study_group
    social = participant.social_features
    valstrings = [userstats_valstring(report, key_list) for key_list in key_lists]
    print ("%d,%s,%s,%s,%s,%s" % \
           (pk, name, email, study_group, str(social),",".join(valstrings)) \
          ).encode('ascii', 'backslashreplace')

def userstats_valstring(report, keys):
    vals = [str(report[key]) for key in keys]
    return ",".join(vals)

def userstats_uistring(ui):
    """ Turns the ui boolean into a human-readable variable """
    return "ui" if (ui == 1) else "noui"
 
def userstats_updateassignments(spa, order, assignments):
    """
    Given the assignment in spa, updates and returns the
    assignments dictionary
    """
    ui = userstats_uistring(spa.user_interface)
    assignments['order_%s' % (ui)] = order
    assignments['start_time_%s' % (ui)] = spa.start_time
    assignments['end_time_%s' % (ui)] = spa.end_time
    return assignments

def userstats_updatereport(ui, report, stats):
    """ Updates the report with the statistics from stats """
    uistring = userstats_uistring(ui)
    for k, v in stats.items():
        report["%s_%s" % (k, uistring)] = v
    return report

def userstats_first(stats, normalized):
    """ Called on the very first iteration/user """
    keys = stats.keys()
    norm_keys = normalized.keys()
    assign_keys = ["order_ui", "order_noui", "start_time_ui", \
        "start_time_noui", "end_time_ui", "end_time_noui"]
    ui_keys = ["%s_ui" % (key) for key in keys]
    noui_keys = ["%s_noui" % (key) for key in keys]
    ui_norm_keys = ["%s_ui" % (key) for key in norm_keys]
    noui_norm_keys = ["%s_noui" % (key) for key in norm_keys]
    print "pk,name,email,study_group,social,%s,%s,%s,%s,%s" % \
        ( \
         ",".join(assign_keys), ",".join(ui_keys), ",".join(noui_keys), \
         ",".join(ui_norm_keys), ",".join(noui_norm_keys) \
        )
    return (assign_keys, ui_keys, noui_keys, ui_norm_keys, noui_norm_keys)

def normalize(to_norm, norm_key):
    normalized = dict()
    norm_val = to_norm[norm_key] * 1.0
    for k, v in to_norm.items():
        new_key = "%s_div_%s" % (k, norm_key)
        if norm_val != 0:
            normalized[new_key] = to_norm[k]/norm_val
        else:
            normalized[new_key] = ''
    return normalized

if __name__ == "__main__":
    num_args = len(sys.argv)
    if sys.argv[1] == 'user-stats-since':
        if len(sys.argv) == 3:
            userstatssince(int(sys.argv[2]))
        elif len(sys.argv) == 4:
            person = StudyParticipant.objects.filter(sharer__user__email = sys.argv[3])
            userstatssince(int(sys.argv[2]), person)
    elif sys.argv[1] == 'user-stats':
        if len(sys.argv) == 2:
            userstats()
        elif len(sys.argv) == 3:
            person = StudyParticipant.objects.filter(sharer__user__email = sys.argv[2])            
            userstats(person)
    else:
        print "Arguments: [user-stats|user-stats-since num-days]"
