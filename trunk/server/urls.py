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
    url(r'^recommend/', 'server.feedme.recommend.recommend', name='recommend'),
    url(r'^loggedin/', 'server.feedme.loggedin.logged_in', name='logged in'),
    url(r'^check_logged_in/', 'server.feedme.check_logged_in.check_logged_in', name='check login'),
    url(r'^share/', 'server.feedme.share.share', name='share'),
    url(r'^unsubscribe/', 'server.feedme.subscription.unsubscribe', name='unsubscribe'),
    url(r'^resubscribe/(?P<user_email>\S+)/(?P<resubscribe_val>\d+)/$', 'server.feedme.subscription.resubscribe', name='resubscribe'),
)