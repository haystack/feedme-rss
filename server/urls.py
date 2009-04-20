from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^server/', include('server.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    #(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/(.*)', admin.site.root, name="admin"),
    url(r'^accounts/', include('registration.urls')),
    url(r'^recommend/', 'server.fwd.recommend.recommend', name='recommend'),
    url(r'^share/recipient/(?P<recipient_username>\S+)/toggle/(?P<toggle>\d)', 'server.fwd.share.share', name='share'),
    url(r'^share/email/(?P<recipient_email>\S+)/toggle/(?P<toggle>\d)', 'server.fwd.share.share'),
    url(r'^loggedin/', 'server.fwd.loggedin.logged_in', name='logged in'),
    url(r'^comment/', 'server.fwd.comment.comment', name='comment'),
    url(r'^send/', 'server.fwd.send.send', name='send'),
)