from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
import datetime
import sys
import numpy
import nltk
from django.core.mail import EmailMultiAlternatives
from django.utils import html
from django.contrib.auth.models import User
from django.db.models import F
from datetime import timedelta
from django.template import Context, loader

NUM_POSTS = 5

# We don't want to show up in statistics
admins = ['msbernst@mit.edu', 'marcua@csail.mit.edu',
          'karger@csail.mit.edu', 'rthe@media.mit.edu',
          'ericker@gmail.com']

if __name__ == "__main__":
    for receiver in Receiver.objects.all():
        posts = SharedPost.objects \
                    .filter(sharedpostreceiver_receiver = receiver) \
                    .filter(sharedpostreceiver_sent = True) \
                    .exclude(sharer__user__email__in = admins) \
                    .order_by('?')
        if posts.count() > NUM_POSTS:
            posts = posts[0:NUM_POSTS]

        context = Context({"shared_post": shared_post})
        template = loader.get_template("recipient_survey.html")
        html_content = template.render(context)
        
        plaintext_template = loader.get_template("recipient_survey_plaintext.html")
        text_content = plaintext_template.render(context)
        text_content = nltk.clean_html(text_content)

        subject = u"FeedMe Survey---Prize for Participating"
        to_emails = [receiver.user.email]
        print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('ascii', 'backslashreplace')
        print (u'Text: ' + html_content).encode('ascii', 'backslashreplace')
        print "-------------"

        from_email = "feedme@csail.mit.edu"
      #  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
      #  email.attach_alternative(html_content, "text/html")
      #  email.send()
