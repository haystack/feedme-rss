from django.http import HttpResponse
from django.contrib.auth.models import User
from models import *
from django.contrib.auth.decorators import login_required
import datetime
from server.feedme.models import *

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



