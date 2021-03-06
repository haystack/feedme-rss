from server.feedme.models import *
from django.contrib import admin

# user gets registered by models.py because of the ForeignKey relation
# admin.site.register(User)
admin.site.register(Sharer)
admin.site.register(Receiver)
admin.site.register(Feed)
admin.site.register(Post)
admin.site.register(SharedPost)
admin.site.register(SharedPostReceiver)
admin.site.register(Term)
admin.site.register(TermVectorCell)
admin.site.register(ViewedPost)
admin.site.register(ViewedPostRecommendation)
admin.site.register(LoggedIn)
admin.site.register(StudyParticipant)
admin.site.register(StudyParticipantAssignment)
