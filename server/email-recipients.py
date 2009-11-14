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
from django.forms import EmailField
from django.conf import settings

NUM_POSTS = 5

# We don't want to show up in statistics
admins = ['msbernst@mit.edu', 'marcua@csail.mit.edu',
          'karger@csail.mit.edu', 'rthe@media.mit.edu',
          'ericker@gmail.com']

if __name__ == "__main__":
    email_validator = EmailField()
    for receiver in Receiver.objects.all():
        try:
            email_validator.clean(receiver.user.email)
        except django.forms.ValidationError:
            print (receiver.user.email + ' is not a valid email').encode('ascii', 'backslashreplace')
            continue
        
        posts = SharedPost.objects \
                    .filter(sharedpostreceiver__receiver = receiver) \
                    .filter(sharedpostreceiver__sent = True) \
                    .exclude(sharer__user__email__in = admins) \
                    .distinct() \
                    .order_by('?')[:5]
#        if posts.count() > NUM_POSTS:
#            posts = posts[0:NUM_POSTS]
        if posts.count() > 0:
            context = Context({"shared_posts": posts})
            template = loader.get_template("recipient_survey.html")
            html_content = template.render(context)
        
            plaintext_template = loader.get_template("recipient_survey_plaintext.html")
            text_content = plaintext_template.render(context)
            text_content = nltk.clean_html(text_content)

            subject = u"FeedMe Survey---$30 Raffle for Participating"
            to_emails = [receiver.user.email]
            print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('ascii', 'backslashreplace')
            #print (u'Text: ' + html_content).encode('ascii', 'backslashreplace')
            #print "-------------"

            from_email = settings.DEFAULT_FROM_EMAIL
            email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
            #email.attach_alternative(html_content, "text/html")
            email.send()
            #sys.exit(0)
