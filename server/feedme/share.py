from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.mail import EmailMultiAlternatives
from django.utils import html
from django.template import Context, loader
from models import *
import re
import nltk
import codecs, sys
import term_vector
import time

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)


@login_required
def share_jsonp(request):
  recipient_emails = request.REQUEST['recipients'].split(",")
  response = get_share_json(request, recipient_emails)
  response = "%s(%s);" % (request.REQUEST['callback'], response)
  return HttpResponse(response, \
                      mimetype='application/json')

@login_required
def share(request):
  recipient_emails = request.REQUEST.getlist('recipients')
  return HttpResponse(get_share_json(request, recipient_emails), \
                      mimetype='application/json')

def get_share_json(request, recipient_emails):
  feed_url = request.REQUEST['feed_url']
  post_url = request.REQUEST['post_url']
  digest = (request.REQUEST['digest'] == 'true')
  send_individually = False
  if 'send_individually' in request.REQUEST:
    send_individually = (request.REQUEST['send_individually'] == 'true')


  comment = request.REQUEST['comment']
  if 'bookmarklet' in request.REQUEST:
    bookmarklet = request.REQUEST['bookmarklet'] == 'true' or request.REQUEST['bookmarklet'] == '1'
  else:
    bookmarklet = False
  client = 'greader'
  if 'client' in request.REQUEST:
    client = request.REQUEST['client']
  referrer = ''
  if 'referrer' in request.REQUEST:
    referrer = request.REQUEST['referrer']

  shared_post = create_shared_post(request.user, \
                                   post_url, feed_url, \
                                   recipient_emails, comment, \
                                   digest, bookmarklet, \
                                   client, referrer)

  receivers = Receiver.objects \
    .filter(sharedpostreceiver__shared_post = shared_post) \
    .filter(sharedpostreceiver__sent = False).distinct()
  for receiver in receivers:
    receiver.term_vector_dirty = True
    receiver.save()

  print "preparing to send post"
  send_post(shared_post, send_individually)

  script_output = "{\"response\": \"ok\"}"
  return script_output

def create_shared_post(user_sharer, post_url, feed_url, \
                       recipient_emails, comment, digest, bookmarklet, \
                       client, referrer):
  """Create all necessary objects to perform the sharing action"""
  # get the recipients, creating Users if necessary
  try:
    sharer = Sharer.objects.get(user=user_sharer)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=user_sharer)
    sharer.save()

  # get the post
  post = Post.objects.filter(feed__rss_url = feed_url).get(url=post_url)
  shared_post = SharedPost(post = post, sharer = sharer, \
                           comment = comment, bookmarklet = bookmarklet, \
                           client = client, referrer = referrer)
  shared_post.save()

  # get or create the recipients' User, Recipient and SharedPostRecipient
  # objects
  for recipient_email in recipient_emails:
    try:
      user_receiver = User.objects.get(email = recipient_email)
    except User.DoesNotExist:
      # Create a user with that username, email and password.
      user_receiver = User.objects.create_user(recipient_email, \
                                               recipient_email, \
                                               recipient_email)
      user_receiver.save()
    try:
      receiver = Receiver.objects.get(user=user_receiver)
    except Receiver.DoesNotExist:
      receiver = Receiver(user=user_receiver)
      receiver.save()

    # always create a new SharedPostReceiver, because we always
    # treat this as a new action and send a new email
    shared_post_receiver = SharedPostReceiver( \
        shared_post=shared_post, receiver=receiver, digest = digest, \
        sent = False)
    # if the receiver has elected to only receive digests...
    if receiver.digest is True:
      shared_post_receiver.digest = True
    shared_post_receiver.save()

  return shared_post


def send_post(post_to_send, send_individually):
    receivers = SharedPostReceiver.objects \
                .filter(shared_post = post_to_send) \
                .filter(digest = False) \
                .filter(sent = False)

    if len(receivers) == 0:
      print 'No receivers, escaping'
      return
    
    if send_individually:
      for receiver in receivers:
        send_post_email(post_to_send, [receiver])
    else:
      send_post_email(post_to_send, receivers)

    for receiver in receivers:
      receiver.sent = True
      receiver.save()

def send_post_email(shared_post, receivers):
  """Sends the post in an email to the recipient"""
  post = shared_post.post
  subject = u"[FeedMe] " + post.title.strip().replace("\n"," ")
  sharer = shared_post.sharer.user

  if sharer.first_name != u'' or sharer.last_name != u'':
    from_email = sharer.first_name + u' ' + sharer.last_name + \
    u' <' + sharer.email + u'>'
  else:
    from_email = shared_post.sharer.user.email
  
  """Don't send emails to users who choose to subscribe to RSS only"""
  
  to_emails = []
  for receiver in receivers:
    if not receiver.receiver.feed_only:
      to_emails.append(receiver.receiver.user.email)
  if shared_post.sharer.cc_me:
    to_emails.append(from_email)

  try:
    thanks = StudyParticipant.objects.get(sharer = shared_post.sharer) \
             .social_features
  except StudyParticipant.DoesNotExist:
    thanks = True

  context = Context({"shared_post": shared_post, "thanks": thanks})
  template = loader.get_template("share_email.html")
  html_content = template.render(context)
  
  print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('ascii', 'backslashreplace')    
  plaintext_template = loader.get_template("share_email_plaintext.html")
  text_content = plaintext_template.render(context)
  text_content = nltk.clean_html(text_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()
