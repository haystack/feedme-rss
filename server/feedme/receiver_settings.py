from django.shortcuts import render_to_response
import random

from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from models import *
from django.conf import settings

def get_settings_url(request):
  if not 'email' in request.POST:
    return get_email_template("Enter an email address for which to " \
                              + "change settings:")

  try:
    receiver_email = request.POST['email']
    user_receiver = User.objects.get(email = receiver_email)
    receiver = Receiver.objects.get(user = user_receiver)
    reset_seed(receiver)
    email_settings_url(receiver_email, receiver.settings_seed)
    receiver.save()

    return get_email_template("We have emailed you with information " 
                              + "on changing your subscription settings")
  except User.DoesNotExist:
    return get_email_template('That email address does not exist')
  except Receiver.DoesNotExist:
    return get_email_template('That email address has never received mail')
  
def get_email_template(message):
  return render_to_response('get_receiver_email.html', \
                            {'message' : message})

def reset_seed(receiver):
  receiver.settings_seed = random.randrange(1,1000000)

def email_settings_url(receiver_email, settings_seed):
  subject = u'[FeedMe] Subscription settings information for FeedMe'
  from_email = settings.DEFAULT_FROM_EMAIL
  to_emails = [receiver_email]

  message = u"""
  You are receiving this message because you requested to change your
  subscription settings on FeedMe.

  To modify your settings, go here:

  http://feedme.csail.mit.edu/receiver/settings/%s/%d/

  Thank you! Feel free to email us at feedme@csail.mit.edu with any comments.
  """ % (receiver_email, settings_seed)

  email = EmailMultiAlternatives(subject, message, from_email, to_emails)
  email.send()

def change_receiver_settings(request, user_email, settings_seed):
  (error, message, receiver) = \
    settings_access_allowed(request, user_email, settings_seed)

  if (not error) and request.POST:
    receiver.recommend = (request.POST['recommend'] == u'True')
    receiver.digest = (request.POST['digest'] == u'True')
    reset_seed(receiver)
    email_settings_changed(user_email, receiver.settings_seed)
    receiver.save()
    message = 'Your settings have been changed'
  
  template_arguments = {
    'error' : error,
    'message' : message,
  }
  if not error:
    template_arguments['recommend'] = receiver.recommend
    template_arguments['digest'] = receiver.digest
    template_arguments['user_email'] = user_email

  return render_to_response('change_settings.html', template_arguments)

def settings_access_allowed(request, user_email, settings_seed):
  try:
    user_receiver = User.objects.get(email = user_email)
    receiver = Receiver.objects.get(user = user_receiver)
  except User.DoesNotExist:
    return (True, 'That email address does not exist.', None)
  except Receiver.DoesNotExist:
    return (True, 'That email address has never received mail.', None) 
  if not str(receiver.settings_seed) == settings_seed:
    return (True, 
            'Invalid settings key.  Check your email for the correct URL.',
            None)
  
  return (False, None, receiver)
  
def email_settings_changed(receiver_email, settings_seed):
  subject = u'[FeedMe] Subscription settings changed for FeedMe'
  from_email = settings.DEFAULT_FROM_EMAIL
  to_emails = [receiver_email]

  message = u"""
  Your settings for FeedMe have changed.  If you are receiving
  this email in error and wish to verify your settings, please visit

  http://feedme.csail.mit.edu/receiver/settings/%s/%d/

  Thank you! Feel free to email us at feedme@csail.mit.edu with any comments.
  """ % (receiver_email, settings_seed)
  
  email = EmailMultiAlternatives(subject, message, from_email, to_emails)
  email.send()
