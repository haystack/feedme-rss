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
    viewed_post = ViewedPost.objects \
                  .filter(post__feed__rss_url = feed_url) \
                  .filter(post__url=post_url) \
                  .order_by('-time')[0]
    viewed_post.link_clickthrough = True
    viewed_post.save()

    script_output = "{\"response\": \"ok\"}"
    return HttpResponse(script_output, mimetype='application/json')
    
    
