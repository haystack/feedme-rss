from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.models import User
from models import *
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
import re

@login_required
def share(request, toggle, recipient_username=None, recipient_email=None):
  post_url = request.POST['post_url']
  share = int(toggle) == 1 # true if we're sharing, false if we're canceling

  # get the individuals being referred to
  user_sharer = request.user
  # get the recipient, creating a User if necessary
  if recipient_email != None:
    user_matches = User.objects.filter(email=recipient_email)
    if len(user_matches) == 0:
      # create a new user and specify they are recipients only
      user_receiver = User.objects.create_user('fwd_' + format_email(recipient_email), recipient_email)
    else:
      user_receiver = user_matches[0]
  else:
    user_receiver = User.objects.get(username=recipient_username)
  
  try:
    sharer = Sharer.objects.get(user=user_sharer)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=user_sharer)
    sharer.save()
  try:
    receiver = Receiver.objects.get(user=user_receiver)
  except Receiver.DoesNotExist:
    receiver = Receiver(user=user_receiver)
    receiver.save()

  # get the post
  post = Post.objects.get(url=post_url)
  try:
    shared_post = SharedPost.objects.get(post=post, sharer=sharer)
  except SharedPost.DoesNotExist:
    shared_post = SharedPost(post=post, sharer=sharer)
    shared_post.save()
  try:
    # protection against somehow suggesting it twice
    shared_post_receiver = SharedPostReceiver.objects.get(shared_post=shared_post, receiver=receiver)
  except SharedPostReceiver.DoesNotExist:
    shared_post_receiver = SharedPostReceiver(shared_post=shared_post, receiver=receiver)
    shared_post_receiver.save()

  if share:
    send_mail('%s' % post.title, '%s \n%s \n%s \nsent by %s \npowered by Fwd: pass it on.' % (post.title, post.url, post.contents, sharer.user.email), '%s' % (sharer.user.email), [receiver.user.email], fail_silently=False)
  else:
    shared_post_receiver.delete()
    if len(SharedPostReceiver.objects.filter(shared_post=shared_post)) == 0:
      shared_post.delete()
    
  script_output = "{'response': 'ok'}"
  return HttpResponse(script_output, mimetype='application/json')

# returns an email address reformatted to be a username (alphanumeric only)
def format_email(email):
  return re.sub(r'\W', '_', email)
