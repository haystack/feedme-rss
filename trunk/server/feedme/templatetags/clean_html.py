from django import template
from django.template.defaultfilters import stringfilter
from server.feedme import textutil

register = template.Library()

@register.filter(name='clean_html')
@stringfilter
def clean_html(value):
   return textutil.clean_html(value) 

