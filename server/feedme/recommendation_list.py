from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required

@login_required
def recommendation_list(request):
  posts = Post.objects.filter(sharedpost__sharedpostreceiver__receiver__user = request.user)
  if 'feed_url' in request.REQUEST:
    posts = posts.filter(feed__rss_url = request.REQUEST['feed_url'])
  if 'limit' in request.REQUEST:
    posts = posts.order_by('-sharedpost__sharedpostreceiver__time')
    posts = posts[:int(request.REQUEST['limit'])]
    
  urls = []
  for post in posts:
    urls.append(post.url)
  
  response = simplejson.dumps(urls)
  response = "%s(%s);" % (request.REQUEST['callback'], response);
  return HttpResponse(response, \
                      mimetype='application/json')
