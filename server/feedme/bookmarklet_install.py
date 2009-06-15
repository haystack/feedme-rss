from django.shortcuts import render_to_response

def bookmarklet_install(request):
  return render_to_response('bookmarklet_install.html')
