from models import *
import codecs, sys
from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.decorators import login_required

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

@login_required
def reader_click(request):
    """Logs that a GReader user clicked through on a link in a post"""
    feed_url = request.POST['feed_url']
    post_url = request.POST['post_url']
    sharer = Sharer.objects.get(user = request.user)
    viewed_posts = ViewedPost.objects \
                  .filter(post__feed__rss_url = feed_url) \
                  .filter(post__url=post_url) \
                  .order_by('-time')
    if len(viewed_posts) > 0:
        viewed_post = viewed_posts[0]
        viewed_post.link_clickthrough = True
        viewed_post.save()
    # TODO: this won't work if the recommend transaction hasn't committed
    # and created the ViewedPost by the time this function is called

    script_output = "{\"response\": \"ok\"}"
    return HttpResponse(script_output, mimetype='application/json')
    
    
