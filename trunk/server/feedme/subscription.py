from django.shortcuts import render_to_response
import random

from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from models import *

def unsubscribe(request):
  if not 'email' in request.POST:
    return unsubscribe_template('Enter an email address to unsubscribe')
  
  receiver_email = request.POST['email']
  
  try:
    user_receiver = User.objects.get(email = receiver_email)
  except User.DoesNotExist:
    return unsubscribe_template('That email address does not exist')
  
  try:
    receiver = Receiver.objects.get(user = user_receiver)
  except Receiver.DoesNotExist:
    return unsubscribe_template('That email address has never received mail')

  receiver.resubscribe_val = random.randrange(1,1000000)
  receiver.subscribed = False

  email_unsubscriber(receiver, receiver_email)
  
  receiver.save()

  page_msg = 'Unsubscribed %s.  Check your email for more information.' \
             % (receiver_email)
  return unsubscribe_template(page_msg)
  
def unsubscribe_template(message):
  return render_to_response('unsubscribe.html', \
                            {'message' : message})

def email_unsubscriber(receiver, receiver_email):
  subject = u'Unsubscribe information for FeedMe'
  from_email = u'feedme@csail.mit.edu'
  to_emails = [receiver_email]

  message = u"""
  We're sorry you decided to unsubscribe from FeedMe messages.

  If you change your mind and want to resubscribe, go here:

  http://feedme.csail.mit.edu:8000/%s/%d/

  Keep in mind that if a friend chooses to share an article with
  you directly, we can't stop them from doing this.  We're just
  not going to recommend you as a potential recipient of
  future recommendations.

  Feel free to email us at feedme@csail.mit.edu with any comments.
  """ % (receiver_email, receiver.resubscribe_val)

  email = EmailMultiAlternatives(subject, message, from_email, to_emails)
  email.send()

def resubscribe(request, user_email, resubscribe_val):
  try:
    user_receiver = User.objects.get(email = user_email)
  except User.DoesNotExist:
    return resubscribe_template('That email address does not exist.')
  
  try:
    receiver = Receiver.objects.get(user = user_receiver)
  except Receiver.DoesNotExist:
    return resubscribe_template('That email address has never received mail.')

  if receiver.subscribed:
    return resubscribe_template('That email address is already subscribed.')
    
  if str(receiver.resubscribe_val) != resubscribe_val:
    return resubscribe_template('Invalid resubscribe key.  Check your email for '\
                                + 'the correct reubscription URL.')
  
  email_resubscriber(user_email)

  receiver.resubscribe_val = 0
  receiver.subscribed = True
  receiver.save()
  
  return resubscribe_template('Welcome back!  We missed you!')
    
def resubscribe_template(message):
  return render_to_response('resubscribe.html', \
                            {'message' : message})

def email_resubscriber(receiver_email):
  subject = u'Resubscribe information for FeedMe'
  from_email = u'feedme@csail.mit.edu'
  to_emails = [receiver_email]

  message = u"""
  You are now re-registered for FeedMe.  If you are receiving
  this email in error and wish to remain unsubscribed, please
  visit

  http://feedme.csail.mit.edu:8000/unsubscribe/

  Welcome back!
  """
  email = EmailMultiAlternatives(subject, message, from_email, to_emails)
  email.send()
