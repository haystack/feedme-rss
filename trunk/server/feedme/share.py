from django.http import HttpResponse
from django.core import serializers
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.mail import EmailMultiAlternatives
from django.utils import html
from models import *
import re
import nltk
import codecs, sys
import term_vector

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

@login_required
def share(request):
  post_url = request.POST['post_url']
  recipient_emails = request.POST.getlist('recipients')

  # Escape any HTML in the comment, turn \n's into <br>'s, and autolink
  # any URLs in the text
  comment = request.POST['comment']
  if comment != "":
    comment = html.escape(comment)
    comment = html.linebreaks(comment)
    comment = html.urlize(comment)

  shared_post = create_shared_post(request.user, \
                                   post_url, recipient_emails, comment)
  send_post(shared_post)

  # do online updating of profiles of people who received the post
  receivers = Receiver.objects.filter( \
    sharedpostreceiver__shared_post = shared_post)
  for receiver in receivers:
    term_vector.create_profile_terms(receiver)

  script_output = "{\"response\": \"ok\"}"
  return HttpResponse(script_output, mimetype='application/json')

def create_shared_post(user_sharer, post_url, recipient_emails, comment):
  """Create all necessary objects to perform the sharing action"""
  # get the recipients, creating Users if necessary
  try:
    sharer = Sharer.objects.get(user=user_sharer)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=user_sharer)
    sharer.save()

  # get the post
  post = Post.objects.get(url=post_url)
  try:
    shared_post = SharedPost.objects.get(post=post, sharer=sharer)
  except SharedPost.DoesNotExist:
    shared_post = SharedPost(post=post, sharer=sharer)
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
    try:
      shared_post_receiver = SharedPostReceiver.objects.get( \
        shared_post=shared_post, receiver=receiver)
    except SharedPostReceiver.DoesNotExist:
      shared_post_receiver = SharedPostReceiver( \
        shared_post=shared_post, receiver=receiver)
      shared_post_receiver.save()

  return shared_post


def send_post(post_to_send):
    receivers = SharedPostReceiver.objects \
                .filter(shared_post = post_to_send) \
                .filter(sent__exact = False)

    send_post_email(post_to_send, receivers)

    receivers.sent = True
    for receiver in receivers:
        receiver.save()


def send_post_email(shared_post, receivers):
  """Sends the post in an email to the recipient"""
  post = shared_post.post
  subject = post.title
  from_email = shared_post.sharer.user.email
  to_emails = [receiver.receiver.user.email for receiver in receivers]
  comment = shared_post.comment

  print u'sending ' + subject + u' to ' + unicode(to_emails)
  
  html_content = u''
  if comment is not u'':
      html_content += comment + '<br /><br />'
  html_content += shared_post.sharer.user.email + u" thought you might " + \
                 u"like this post. " +\
                 u"They're beta testing FeedMe, a tool we're developing " +\
                 u"at MIT, so please feel free to <a href='mailto:feedme@" +\
                 u"csail.mit.edu'>email us</a> with comments</a>." +\
                 u"<br />\n<br />\n "
  html_content += u"<b><a href='" + post.url + \
                  u"'>" + post.title + u"</a></b> \n<br />"
  html_content += u"<a href='" + post.feed.rss_url + "'>" + \
                  post.feed.title + "</a><br />"
  html_content += post.contents
  html_content += u"<br /><br /><span style='color: gray'>Sent via FeedMe: " +\
                  u"a (very) alpha tool at MIT. Have comments, or are your " +\
                  u"friends spamming you? Email us at feedme@csail.mit.edu." +\
                  u"<br /><br /><a href='http://feedme.csail.mit.edu:8000" +\
                  u"/unsubscribe/'>Change your e-mail receiving settings" +\
                  u"</a> to get only a digest, or never be recommended posts."

  print html_content
  text_content = nltk.clean_html(html_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()
