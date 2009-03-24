from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required

@login_required
def recommend(request):
  sharer_user = request.user

  feed_url = request.POST['feed_url']
  post_url = request.POST['post_url']
  post_title = request.POST['post_title']
  post_contents = request.POST['post_contents']

  # create objects if we need to
  try:
    feed = Feed.objects.get(rss_url=feed_url)
  except Feed.DoesNotExist:
    feed = Feed(rss_url=feed_url)
    feed.save()
  try:
    post = Post.objects.get(url=post_url)
  except Post.DoesNotExist:
    post = Post(url=post_url, feed=feed, title=post_title, contents=post_contents)
    post.save()
  try:
    sharer = Sharer.objects.get(user=sharer_user)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=sharer_user)
    sharer.save()

  users = User.objects.filter(is_active=True).exclude(username=sharer_user.username)

  # find out if we've already shared it with anyone
  try:
    shared_post = SharedPost.objects.get(post=post, sharer=sharer)
    shared_post_receivers = SharedPostReceiver.objects.filter(shared_post=shared_post)
    shared_users = []
    for shared_user in shared_post_receivers:
      shared_users.append(shared_user.receiver.user)
  except SharedPost.DoesNotExist:
    shared_users = []
  
  json = serializers.serialize('json', users)
  shared_json = serializers.serialize('json', shared_users)
  
  script_output = '{posturl: \'' + post.url + '\', users: ' + json + ', shared: ' + shared_json + '}'
  return HttpResponse(script_output, mimetype='application/json')

