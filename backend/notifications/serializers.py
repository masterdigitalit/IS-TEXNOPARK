# user/serializers.py - добавляем
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()
    read_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'text',
            'is_read',
            'created_at',
            'created_at_formatted',
            'read_at',
            'read_at_formatted'
        ]
        read_only_fields = ['created_at', 'read_at']
    
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime('%d.%m.%Y %H:%M') if obj.created_at else None
    
    def get_read_at_formatted(self, obj):
        return obj.read_at.strftime('%d.%m.%Y %H:%M') if obj.read_at else None