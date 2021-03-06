from django.forms import ModelForm, CheckboxSelectMultiple
from server.feedme.models import *
from django.contrib.auth.decorators import login_required
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.forms.models import modelformset_factory, inlineformset_factory

class SharerForm(ModelForm):
        
    class Meta:
        model = Sharer
        exclude = ['user']        
        
    def __init__(self, *args, **kwargs):
        super(SharerForm, self).__init__(*args, **kwargs)
        if self.instance:
            self.fields['blacklist'].label = "Do not show these email addresses in my recommendations"
            self.fields['blacklist'].widget = CheckboxSelectMultiple()            
            self.fields['blacklist'].queryset = Receiver.objects \
                                                        .filter(sharedpostreceiver__shared_post__sharer = self.instance) \
                                                        .filter(recommend = True) \
                                                        .distinct() \
                                                        .order_by('user__email')
            self.fields['blacklist'].required = False

@login_required
def sharer_settings(request):
    sharer = Sharer.objects.get(user = request.user)
    posted = request.method == 'POST'
    if posted:
        form = SharerForm(request.POST, instance = sharer)
        if form.is_valid():
            print 'updating user'
            form.save()
    else:
        form = SharerForm(instance = sharer)
    
    sp_receivers = SharedPostReceiver.objects.filter(shared_post__sharer = sharer).order_by('time').reverse()[:10]
    
    return render_to_response("sharer_settings.html", RequestContext(request, \
                             { "form": form, "done": posted, "sp_receivers": sp_receivers, 'user_email': request.user.email, 'settings_seed': Receiver.objects.get(user=request.user).settings_seed }))
