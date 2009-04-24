from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required

@login_required
def logged_in(request):
    return HttpResponse('<span id="success">You are logged in</span>.')
