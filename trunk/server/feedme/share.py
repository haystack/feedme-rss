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
def share(request):
  feed_url = request.POST['feed_url']
  post_url = request.POST['post_url']
  digest = (request.POST['digest'] == 'true')

  recipient_emails = request.POST.getlist('recipients')

  # Escape any HTML in the comment, turn \n's into <br>'s, and autolink
  # any URLs in the text
  comment = request.POST['comment']
  if comment != "":
    comment = html.escape(comment)
    comment = html.linebreaks(comment)
    comment = html.urlize(comment)

  shared_post = create_shared_post(request.user, \
                                   post_url, feed_url, \
                                   recipient_emails, comment, digest)

  receivers = Receiver.objects.filter( \
    sharedpostreceiver__shared_post = shared_post) \
    .filter(sharedpostreceiver__sent = False).distinct()

  print "preparing to send post"
  send_post(shared_post)
  
  # do online updating of profiles of people who received the post
  # it is very inefficient to loop through three times, but this
  # guarantees that all the terms are added to all people
  # before tf*idf is calculated and before vectors are trimmed.
  print "beginning recalculation of tf-idf scores"
  begin_time = time.clock()  
  token_dict = dict()
  # first cache all the tokens
  for receiver in receivers:
    token_dict[receiver.user.username] = receiver.tokenize()

  print 'tokenized: %f' % (time.clock() - begin_time)
  begin_time = time.clock()
  for receiver in receivers:
    term_vector.create_profile_terms(receiver, token_dict[receiver.user.username])
  print 'created terms: %f' % (time.clock() - begin_time)
  begin_time = time.clock()
  for receiver in receivers:
    term_vector.update_tf_idf(receiver, token_dict[receiver.user.username])
  print 'tf-idfed: %f' % (time.clock() - begin_time)
  begin_time = time.clock()    
  for receiver in receivers:
    term_vector.trim_profile_terms(receiver)
  print 'trimmed: %f' % (time.clock() - begin_time)

  script_output = "{\"response\": \"ok\"}"
  return HttpResponse(script_output, mimetype='application/json')

def create_shared_post(user_sharer, post_url, feed_url, \
                       recipient_emails, comment, digest):
  """Create all necessary objects to perform the sharing action"""
  # get the recipients, creating Users if necessary
  try:
    sharer = Sharer.objects.get(user=user_sharer)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=user_sharer)
    sharer.save()

  # get the post
  post = Post.objects.filter(feed__rss_url = feed_url).get(url=post_url)
  try:
    shared_post = SharedPost.objects.get(post = post, sharer = sharer)
  except SharedPost.DoesNotExist:
    shared_post = SharedPost(post = post, sharer = sharer)
  shared_post.comment = comment
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


def send_post(post_to_send):
    receivers = SharedPostReceiver.objects \
                .filter(shared_post = post_to_send) \
                .filter(digest = False) \
                .filter(sent = False)

    if len(receivers) == 0:
      print 'No receivers, escaping'
      return
    
    send_post_email(post_to_send, receivers)

    for receiver in receivers:
      receiver.sent = True
      receiver.save()


def send_post_email(shared_post, receivers):
  """Sends the post in an email to the recipient"""
  post = shared_post.post
  subject = post.title.strip()
  from_email = shared_post.sharer.user.email
  to_emails = [receiver.receiver.user.email for receiver in receivers]
  if from_email != u'karger@csail.mit.edu':
    to_emails.append(from_email)
  else:
    print 'SPECIAL CASE KARGER NOT CC\'ED'
  comment = shared_post.comment

  context = Context({"shared_post": shared_post, "post": post, "comment": comment})
  template = loader.get_template("share_email.html")
  html_content = template.render(context)

  print u'sending ' + subject + u' to ' + unicode(to_emails)


  plaintext_template = loader.get_template("share_email_plaintext.html")
  text_content = plaintext_template.render(context)
  text_content = nltk.clean_html(text_content)
  print text_content
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()
