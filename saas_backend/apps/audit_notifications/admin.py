from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import AuditLog, Notification
from apps.users.models import User
from django.contrib.contenttypes.models import ContentType


# ────────────────────────────────────────────────
# Journal d'Audit (AuditLog) – très utile pour traçabilité
# ────────────────────────────────────────────────
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp', 'user_link', 'action', 'model_name',
        'object_id', 'ip_address'
    )
    list_filter = ('action', 'timestamp')
    search_fields = (
        'user__username', 'user__first_name', 'user__last_name',
        'model_name', 'object_id', 'details'
    )
    list_select_related = ('user',)
    readonly_fields = ('timestamp', 'ip_address', 'user_agent')
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        (_('Utilisateur et action'), {
            'fields': ('user', 'action', 'timestamp')
        }),
        (_('Objet concerné'), {
            'fields': ('model_name', 'object_id')
        }),
        (_('Détails'), {
            'fields': ('details',)
        }),
        (_('Contexte technique'), {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        if obj.user:
            return format_html('<a href="/admin/users/user/{}/">{}</a>', obj.user.id, obj.user.get_full_name() or obj.user.username)
        return "-"
    user_link.short_description = "Utilisateur"
    user_link.allow_tags = True


# ────────────────────────────────────────────────
# Notifications
# ────────────────────────────────────────────────
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'title_short', 'user_link', 'type', 'priority',
        'is_read', 'is_sent', 'sent_via', 'created_at'
    )
    list_filter = ('type', 'priority', 'is_read', 'is_sent', 'sent_via')
    search_fields = (
        'user__username', 'user__first_name', 'user__last_name',
        'title', 'message'
    )
    list_select_related = ('user', 'content_type')
    readonly_fields = ('created_at', 'read_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        (_('Destinataire'), {
            'fields': ('user',)
        }),
        (_('Contenu'), {
            'fields': ('type', 'priority', 'title', 'message')
        }),
        (_('Lien vers objet'), {
            'fields': ('content_type', 'object_id')
        }),
        (_('Statut'), {
            'fields': ('is_read', 'read_at', 'is_sent', 'sent_via')
        }),
        (_('Métadonnées'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def title_short(self, obj):
        return obj.title[:60] + '...' if len(obj.title) > 60 else obj.title
    title_short.short_description = "Titre"
    
    def user_link(self, obj):
        return format_html('<a href="/admin/users/user/{}/">{}</a>', obj.user.id, obj.user.get_full_name() or obj.user.username)
    user_link.short_description = "Utilisateur"
    user_link.allow_tags = True