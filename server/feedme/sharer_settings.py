from django.forms import ModelForm
from server.feedme.models import *
from django.contrib.auth.decorators import login_required
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.forms.models import modelformset_factory, inlineformset_factory

class SharerForm(ModelForm):
    class Meta:
        model = Sharer
        exclude = ['user']        
        
        
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

    return render_to_response("sharer_settings.html", RequestContext(request, { "formset": form, "done": posted }))
