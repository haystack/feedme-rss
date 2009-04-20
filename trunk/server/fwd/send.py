from django.http import HttpResponse
from django.contrib.auth.models import User
from models import *
from django.contrib.auth.decorators import login_required
import datetime
from server.fwd.models import *
from django.core.mail import EmailMultiAlternatives
import nltk

@login_required
def send(request):
    post_url = request.POST['post_url']
    sharer = Sharer.objects.get(user = request.user)
    shared_post = SharedPost.objects.filter(sharer=sharer) \
                  .get(post__url = post_url)
    send_post(shared_post)

    script_output = "{\"response\": \"ok\"}"
    return HttpResponse(script_output, mimetype='application/json')

def start_email_daemon():
    """Creates a daemon to send emails every 20 seconds.  Uses daemon.py
    to fork the process.  Warning: under default settings, this won't write
    error messages to disk, so may just crash.  I think there's a way to
    make it write errors somewhere.

    Source: http://code.activestate.com/recipes/278731/
    """
    from django.core.management import setup_environ
    import settings
    setup_environ(settings)
    import daemon

    daemon.createDaemon()

    debug_to_file = True
    while True:
        unsent = SharedPost.objects \
                 .filter(sharedpostreceiver__sent__exact = False)
        for shared_post in unsent:
            send_post_email(shared_post)
        time.sleep(20)


def send_post(post_to_send):
    receivers = SharedPostReceiver.objects \
                .filter(shared_post = post_to_send) \
                .filter(sent__exact = False)

    send_post_email(post_to_send, receivers)

    receivers.sent = True
    for receiver in receivers:
        receiver.save()


def send_post_email(shared_post, receivers):
  "Sends the post in an email to the recipient"
  post = shared_post.post
  subject = post.title
  from_email = shared_post.sharer.user.email
  to_emails = [receiver.receiver.user.email for receiver in receivers]
  comment = shared_post.comment

  print('sending ' + shared_post.post.title + \
        ' to ' + str(to_emails) + '\n')
  
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
  html_content += post.contents
  html_content += u"<br /><br /><span style='color: gray'>Sent via FeedMe: " +\
                  u"a (very) alpha tool at MIT. Have comments, or are your " +\
                  u"friends spamming you? Email us at feedme@csail.mit.edu."

  text_content = nltk.clean_html(html_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()
