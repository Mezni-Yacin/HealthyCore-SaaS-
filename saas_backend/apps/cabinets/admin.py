# apps/cabinets/admin.py

from django.contrib import admin
from .models import (
    Cabinet,
    Doctor,
    DoctorAvailability,
    DoctorUnavailability
)


# ==============================
# Doctor Availability Inline
# ==============================
class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 1


# ==============================
# Doctor Unavailability Inline
# ==============================
class DoctorUnavailabilityInline(admin.TabularInline):
    model = DoctorUnavailability
    extra = 1


# ==============================
# Cabinet Admin
# ==============================
@admin.register(Cabinet)
class CabinetAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "owner",
        "city",
        "phone_number",
        "cnam_affiliated",
        "is_active",
        "created_at"
    )

    list_filter = (
        "city",
        "cnam_affiliated",
        "is_active"
    )

    search_fields = (
        "name",
        "owner__username",
        "owner__first_name",
        "owner__last_name",
        "email"
    )

    ordering = ("name",)

    filter_horizontal = (
        "specialties",
        "secretaries"
    )

    readonly_fields = (
        "created_at",
    )


# ==============================
# Doctor Admin
# ==============================
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "specialty",
        "years_experience",
        "consultation_price",
        "accepts_new_patients",
        "teleconsultation_available",
        "rating"
    )

    list_filter = (
        "specialty",
        "accepts_new_patients",
        "teleconsultation_available"
    )

    search_fields = (
        "user__first_name",
        "user__last_name",
        "license_number"
    )

    ordering = ("user",)

    filter_horizontal = (
        "cabinets",
    )

    inlines = [
        DoctorAvailabilityInline,
        DoctorUnavailabilityInline
    ]


# ==============================
# Doctor Availability Admin
# ==============================
@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):

    list_display = (
        "doctor",
        "day",
        "start_time",
        "end_time",
        "slot_duration",
        "is_available"
    )

    list_filter = (
        "day",
        "is_available"
    )

    search_fields = (
        "doctor__user__first_name",
        "doctor__user__last_name"
    )

    ordering = (
        "doctor",
        "day"
    )


# ==============================
# Doctor Unavailability Admin
# ==============================
@admin.register(DoctorUnavailability)
class DoctorUnavailabilityAdmin(admin.ModelAdmin):

    list_display = (
        "doctor",
        "start_datetime",
        "end_datetime",
        "reason",
        "is_recurring"
    )

    list_filter = (
        "reason",
        "is_recurring"
    )

    search_fields = (
        "doctor__user__first_name",
        "doctor__user__last_name"
    )

    ordering = (
        "-start_datetime",
    )