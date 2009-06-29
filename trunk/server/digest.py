from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.core.mail import EmailMultiAlternatives
from django.template import Context, loader

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
  subject = u"FeedMe Personalized Newspaper: " + posts[0].shared_post.post.title
  from_email = 'FeedMe <feedme@csail.mit.edu>'
  to_emails = [receiver.user.email]

  context = Context({"posts": posts})
  template = loader.get_template("digest.html")
  html_content = template.render(context)
  print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('utf-8')
  
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
  
    print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('utf-8')
  
    html_content = u''
    html_content += u'FeedMe just shared these posts with your friends ' +\
                    u'as part of their occasional FeedMe digest. Now you ' +\
                    u'can talk to them about it, and you were nice enough ' +\
                    u'not to clog their inboxes at the time. What a friend!' +\
                    u'<br /><br />'
    
    for shared_post in shared_posts:
        post = shared_post.post
        html_content += u"<a href='" + post.url + \
                        u"'>" + post.title + u"</a> " +\
                        u"[<a href='" + post.feed.rss_url + u"'>" + \
                        post.feed.title + u"</a>], with "
        for shared_post_receiver in SharedPostReceiver.objects \
            .filter(shared_post = shared_post) \
            .filter(sent = False) \
            .filter(digest = True):
            html_content += shared_post_receiver.receiver.user.email + u' '
        html_content += u"<br />\n"
      
    html_content += u"<br /><br /><span style='color: gray'>Sent via FeedMe: " +\
                    u"a (very) alpha tool at MIT. Have comments, or are your " +\
                    u"friends spamming you? Email us at feedme@csail.mit.edu." +\
                    u"<br /><br /><a href='http://feedme.csail.mit.edu:8000" +\
                    u"/unsubscribe/'>Change your e-mail receiving settings" +\
                    u"</a> to get only a digest, or never be recommended posts."
      
    print html_content.encode('utf-8')
    text_content = nltk.clean_html(html_content)
    email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
    email.attach_alternative(html_content, "text/html")
    email.send()
      
if __name__ == '__main__':
    digest_posts()
