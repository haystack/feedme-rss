from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.core.mail import EmailMultiAlternatives

def digest_posts():
    for receiver in Receiver.objects.filter(recommend = True):
        digested_posts = SharedPostReceiver.objects \
                             .filter(receiver = receiver) \
                             .filter(digest = True) \
                             .filter(sent = False)

        if digested_posts.count() > 0:
            send_digest_posts(digested_posts, receiver)
            for digested_post in digested_posts:
                digested_post.sent = True
                digested_post.save()
        else:
            print receiver.user.username + ' hasn\'t received posts recently'

    
def send_digest_posts(posts, receiver):
  """Sends the list of posts in an email to the recipient"""
  subject = u"FeedMe Personalized Newspaper: " + posts[0].shared_post.post.title
  from_email = 'FeedMe <feedme@csail.mit.edu>'
  to_emails = [receiver.user.email]

  print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('utf-8')
  
  html_content = u''
  html_content += u'Your friends on FeedMe thought that these posts ' +\
                  u'might be interesting, but didn\'t want to bother ' +\
                  u'you with a separate email at the time. Here\'s your ' +\
                  u'weekly newspaper, as authored by your friends!<br />'

  for shared_post_receiver in posts:
      post = shared_post_receiver.shared_post.post
      html_content += u"<a href='" + post.url + \
                      u"'>" + post.title + u"</a> " +\
                      u"[<a href='" + post.feed.rss_url + u"'>" + \
                      post.feed.title + u"</a>], " + \
                      u'from ' + shared_post_receiver.shared_post \
                      .sharer.user.email +\
                      "<br />\n"

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
