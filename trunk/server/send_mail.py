from django.core.management import setup_environ
import settings
setup_environ(settings)
import datetime
from server.fwd.models import *
from django.core.mail import EmailMultiAlternatives
import nltk
import daemon
import time

debug_to_file = True

def start_email_daemon():
    """Creates a daemon to send emails every 20 seconds.  Uses daemon.py
    to fork the process.  Warning: under default settings, this won't write
    error messages to disk, so may just crash.  I think there's a way to
    make it write errors somewhere.

    Source: http://code.activestate.com/recipes/278731/
    """
    daemon.createDaemon()

    while True:
        send_email()
        time.sleep(20)

def send_email():
    if debug_to_file is True:
        log = open('/var/virtualhost/sites/fwd/send_daemon.log', \
                   'a')
        log.write('Sending mail \n')

    now = datetime.datetime.now()
    low_watermark = now - datetime.timedelta(seconds=20)
    posts_to_send = SharedPost.objects.filter(sent__exact = False) \
                        .filter(time__lte = low_watermark)
    print posts_to_send
        
    for post_to_send in posts_to_send:
        receivers = SharedPostReceiver.objects.filter( \
                shared_post = post_to_send)
        for receiver in receivers:
            if debug_to_file is True:
                log.write('sending ' + post_to_send.post.title + \
                              ' to ' + receiver.receiver.user.username + '\n')
            send_post_email(post_to_send, receiver.receiver)
        post_to_send.sent = True
        post_to_send.save()
    if debug_to_file is True:
        log.write('done sending \n\n')
        log.close()


def send_post_email(shared_post, receiver):
  "Sends the post in an email to the recipient"
  post = shared_post.post
  subject = post.title
  from_email = shared_post.sharer.user.email
  to_email = receiver.user.email
  comment = shared_post.comment
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
  email = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
  email.attach_alternative(html_content, "text/html")
  email.send()

  #old way of sending mail
  #send_mail('%s' % post.title, '%s \n%s \n%s \nsent by %s \npowered by Fwd: pass it on.' % (post.title, post.url, post.contents, sharer.user.email), '%s' % (sharer.user.email), [receiver.user.email], fail_silently=False)


