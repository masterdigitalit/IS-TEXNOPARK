# user/models.py - добавляем после модели User
from django.db import models
from user.models import User
from django.utils import timezone



class Notification(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name='Пользователь'
    )
    title = models.CharField('Заголовок', max_length=255)
    text = models.TextField('Текст')
    is_read = models.BooleanField('Прочитано', default=False)
    created_at = models.DateTimeField('Создано', auto_now_add=True)
    read_at = models.DateTimeField('Прочитано в', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()