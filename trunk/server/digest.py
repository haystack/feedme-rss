from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.core.mail import EmailMultiAlternatives
from django.template import Context, loader
import sys, codecs

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

def digest_posts():
    for receiver in Receiver.objects.all():
        digested_posts = SharedPostReceiver.objects \
                             .filter(receiver = receiver) \
                             .filter(digest = True) \
                             .filter(sent = False)

        if digested_posts.count() > 0:
            send_digest_posts(digested_posts, receiver)
        else:
            print receiver.user.username + ' hasn\'t received posts recently'

    # tell the sharers that their posts have been sent
    for sharer in Sharer.objects \
            .filter(sharedpost__sharedpostreceiver__sent = False) \
            .filter(sharedpost__sharedpostreceiver__digest = True) \
            .distinct():
        shared_posts = SharedPost.objects \
                       .filter(sharer = sharer) \
                       .filter(sharedpostreceiver__sent = False) \
                       .filter(sharedpostreceiver__digest = True) \
                       .distinct()
        if shared_posts.count() > 0:
            send_digest_report(shared_posts, sharer)
        else:
            print sharer.user.username + u' hasn\'t shared digest posts'

    for s_p_receiver in SharedPostReceiver.objects \
            .filter(sent = False).filter(digest = True):
        s_p_receiver.sent = True
        s_p_receiver.save()

    
def send_digest_posts(posts, receiver):
  """Sends the list of posts in an email to the recipient"""
  subject = u"FeedMe Personalized Newspaper: " + posts[0].shared_post.post.title.strip()
  from_email = 'FeedMe <feedme@csail.mit.edu>'
  to_emails = [receiver.user.email]

  for post in posts:
      post.thanks = True
      if post.shared_post.sharer.studyparticipant_set.all().count() == 1:
          participant = post.shared_post.sharer.studyparticipant_set.all()[0]
          post.thanks = participant.social_features

  context = Context({"posts": posts})
  template = loader.get_template("digest.html")
  html_content = template.render(context)
  print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('ascii', 'backslashreplace')
  
  template_plaintext = loader.get_template("digest_plaintext.html")
  text_content = template_plaintext.render(context)
  text_content = nltk.clean_html(text_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()

def pluralize(count):
    if count > 1 or count == 0:
        return 's'
    else:
        return ''


def send_digest_report(shared_posts, sharer):
    """Sends an email to the sharer letting him/her know that the digest went out"""
    subject = u"FeedMe Digest Report: " + \
              unicode(shared_posts.count()) + u' post' + \
              pluralize(shared_posts.count()) + ' shared'
    from_email = 'FeedMe <feedme@csail.mit.edu>'
    to_emails = [sharer.user.email]
  

    for shared_post in shared_posts:
        shared_post.receivers = []
        for shared_post_receiver in SharedPostReceiver.objects \
                .filter(shared_post = shared_post) \
                .filter(sent = False) \
                .filter(digest = True):
            shared_post.receivers.append(shared_post_receiver)

    context = Context({'shared_posts': shared_posts})
    template = loader.get_template("digest_report.html")
    html_content = template.render(context)

    template_plaintext = loader.get_template("digest_report_plaintext.html")
    text_content = template_plaintext.render(context)
    text_content = nltk.clean_html(text_content)

    print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('ascii', 'backslashreplace')
    email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
    email.attach_alternative(html_content, "text/html")
    email.send()
      
if __name__ == '__main__':
    digest_posts()
