from django.shortcuts import render_to_response
from django.core.mail import EmailMultiAlternatives
from django.template import Context, loader
from models import *
import codecs, sys
from django.conf import settings

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

def thanks(request, sharedpost_pk):
    shared_post = SharedPost.objects.get(pk = sharedpost_pk)
    shared_post.thanks += 1
    print 'now ' + str(shared_post.thanks) + ' thanks for this post'
    shared_post.save()

    send_thanks_email(shared_post)
    receiver_info = get_receiver_info(shared_post.sharer)

    context = {'shared_post': shared_post, 'receiver_info': receiver_info}
    return render_to_response('thanks.html', context)

def stats(request):
    sharer = Sharer.objects.get(user=request.user)
    receiver_info = get_receiver_info(sharer)

    context = {'sharer': sharer, 'receiver_info': receiver_info}
    return render_to_response('thanks.html', context)

def send_thanks_email(shared_post):
  """Sends a thank-you note to the sharer"""
  post = shared_post.post
  subject = u"Thanks: [FeedMe] " + post.title.strip().replace("\n"," ")

  sharer = shared_post.sharer.user

  if sharer.first_name != u'' or sharer.last_name != u'':
    to_email = sharer.first_name + u' ' + sharer.last_name + \
    u' <' + sharer.email + u'>'
  else:
    to_email = shared_post.sharer.user.email
  to_emails = [ to_email ]
  from_email = settings.DEFAULT_FROM_EMAIL

#  receivers = [spr.receiver.user.email for spr in shared_post.sharedpostreceiver_set.all() ]
#  if len(receivers) == 1:
#      receiver_string = receivers[0]
#      receiver_string += " says "
#  elif len(receivers) == 2:
#      receiver_string = u" and ".join(receivers)
#      receiver_string += " say "      
#  else:
#      receiver_string = u", ".join(receivers[:-1])
#      receiver_string += u" and " + receivers[-1]
#      receiver_string += " say "      
  
  context = Context({"shared_post": shared_post, \
                     "thanks": True})
  template = loader.get_template("thanks_email.html")
  html_content = template.render(context)

  plaintext_template = loader.get_template("thanks_email_plaintext.html")
  text_content = plaintext_template.render(context)
  text_content = nltk.clean_html(text_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()    

def get_receiver_info(sharer):
    """Prepares the dictionary for the template"""
    receiver_info = []
    receivers = Receiver.objects.filter(sharedpostreceiver__shared_post__sharer = sharer).distinct()
    for receiver in receivers:
        thanks = SharedPost.objects \
                 .filter(sharedpostreceiver__receiver = receiver) \
                 .filter(sharer = sharer) \
                 .filter(thanks__gt = 0)
        count = thanks.count()

        if count > 0:
            receiver_info.append( { 'receiver': receiver, 'count': count, 'barwidth': 10*count})

    receiver_info.sort(key=lambda x: x['count'], reverse=True)
    return receiver_info
