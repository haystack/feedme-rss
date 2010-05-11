from models import *
import codecs, sys
from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.decorators import login_required
from django.db import transaction

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

@login_required
@transaction.commit_manually
def reader_click(request):
    """Logs that a GReader user clicked through on a link in a post"""
    feed_url = request.POST['feed_url']
    post_url = request.POST['post_url']

    # If the /recommend/ call hasn't returned yet, the objects won't be
    # available to this transaction.  We keep looping until they are
    keep_looping = True
    while keep_looping:
        try:
            sharer = Sharer.objects.get(user = request.user)
            if sharer.get_study_participant() is None: # they're not a study participant
                script_output = "{\"response\": \"ok\"}"
                return HttpResponse(script_output, mimetype='application/json')
            else:
                viewed_posts = ViewedPost.objects \
                               .filter(post__feed__rss_url = feed_url) \
                               .filter(post__url=post_url) \
                               .filter(sharer = sharer) \
                               .order_by('-time')
                if viewed_posts.count() == 0:
                    transaction.rollback()
                else:
                    keep_looping = False
        except Sharer.DoesNotExist:
            transaction.rollback()
    
    viewed_post = viewed_posts[0]
    viewed_post.link_clickthrough = True
    viewed_post.save()

    transaction.commit()
    script_output = "{\"response\": \"ok\"}"
    return HttpResponse(script_output, mimetype='application/json')

