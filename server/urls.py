from django.conf.urls.defaults import *
from feedme.feeds import PostFeed
import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin

admin.autodiscover()

feeds = {
    'posts': PostFeed,
}

urlpatterns = patterns('',
    # Example:
    # (r'^server/', include('server.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    #(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/(.*)', admin.site.root, name="admin"),
    url(r'^accounts/', include('registration.urls')),
    url(r'^address_book/', 'server.feedme.address_book.address_book', \
        name='address book'),
    url(r'^recommend/', 'server.feedme.recommend.recommend', name='recommend'),
    url(r'^recommend_jsonp/', 'server.feedme.recommend.recommend_jsonp', name='recommend_jsonp'),
    url(r'^recommendation_list/', 'server.feedme.recommendation_list.recommendation_list', name='recommendation_list'),
    url(r'^loggedin/', 'server.feedme.loggedin.logged_in', name='logged in'),
    url(r'^check_logged_in/', 'server.feedme.check_logged_in.check_logged_in', name='check login'),
    url(r'^share/', 'server.feedme.share.share', name='share'),
    url(r'^receiver/settings/$', 'server.feedme.receiver_settings.get_settings_url', name='get receiver settings url'),
    url(r'^receiver/settings/(?P<user_email>\S+)/(?P<settings_seed>\d+)/$', 'server.feedme.receiver_settings.change_receiver_settings', name='change receiver settings'),
    url(r'^sharer/settings/$', 'server.feedme.sharer_settings.sharer_settings', name='change sharer settings'),
    url(r'^bookmarklet/', 'server.feedme.bookmarklet.bookmarklet', name='bookmarklet'),
    url(r'^bookmarklet_install/', 'server.feedme.bookmarklet_install.bookmarklet_install', name='bookmarklet installation'),
    url(r'^thanks/(?P<sharedpost_pk>\d+)/$', 'server.feedme.thanks.thanks', name='thanks'),
    url(r'^seen_it/$', 'server.feedme.seen_it.seen_it', name='seen it'),
    url(r'^tutorial/$', 'server.feedme.tutorial.tutorial', name='tutorial start'),
    url(r'^tutorial/firefox/$', 'server.feedme.tutorial.firefox', name='firefox tutorial'),
    url(r'^tutorial/greasemonkey/$', 'server.feedme.tutorial.greasemonkey', name='greasemonkey tutorial'),
    url(r'^tutorial/feedme/$', 'server.feedme.tutorial.feedme', name='feedme install tutorial'),
    url(r'^tutorial/login/$', 'server.feedme.tutorial.login', name='feedme login tutorial'),
    url(r'^tutorial/readpost/$', 'server.feedme.tutorial.readpost', name='feedme readpost tutorial'),
    url(r'^tutorial/recommendations/$', 'server.feedme.tutorial.recommendations', name='feedme recommendations tutorial'),
    url(r'^tutorial/bookmarklet/$', 'server.feedme.tutorial.bookmarklet', name='feedme bookmarklet tutorial'),
    url(r'^tutorial/exercise/$', 'server.feedme.tutorial.exercise', name='feedme exercise'),

    # logging infrastructure
    url(r'^clickthrough/(?P<sharedpost_pk>\d+)/.*$', 'server.feedme.clickthrough.clickthrough', name='clickthrough'),
    url(r'^reader_click/', 'server.feedme.reader_click.reader_click', name='greader clickthrough'),

    url(r'^^study/', 'server.feedme.study.study', name='study'),
    url(r'^$', 'server.feedme.homepage.homepage', name='homepage'),
    
    # rss feeds
    url(r'^feeds/(?P<url>.*)/$', 'django.contrib.syndication.views.feed', {'feed_dict': feeds}),

    # static content
    url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
)
