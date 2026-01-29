from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import EventRating, EventStatistics


@receiver(post_save, sender=EventRating)
@receiver(post_delete, sender=EventRating)
def update_event_statistics(sender, instance, **kwargs):
    """
    Signal to recalculate event statistics when a rating is saved or deleted.
    """
    event = instance.event
    EventStatistics.calculate_for_event(event)