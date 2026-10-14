from django.db import models


class ContactInquiry(models.Model):
    """Project inquiry submitted from the website's Contact page. Private: admin-only API access."""

    class Status(models.TextChoices):
        NEW = 'new', 'New'
        IN_PROGRESS = 'in_progress', 'In progress'
        RESOLVED = 'resolved', 'Resolved'

    SERVICE_CHOICES = [
        ('web-app', 'Website or Web Application'),
        ('saas', 'SaaS Product'),
        ('business-software', 'Business Software'),
        ('frontend', 'Frontend Development'),
        ('backend-api', 'Backend or API Development'),
        ('automation', 'Automation'),
        ('modernization', 'System Modernization'),
        ('ui-ux', 'UI/UX Design'),
        ('qa', 'Testing and Quality Assurance'),
        ('other', 'Something Else'),
    ]
    BUDGET_CHOICES = [
        ('undecided', 'Not decided yet'),
        ('under-500', 'Under $500'),
        ('500-1500', '$500\u2013$1,500'),
        ('1500-5000', '$1,500\u2013$5,000'),
        ('5000-plus', '$5,000+'),
        ('discuss', "Let's discuss"),
    ]

    name = models.CharField(max_length=120)
    email = models.EmailField()
    company = models.CharField(max_length=160, blank=True)
    service = models.CharField(max_length=32, choices=SERVICE_CHOICES)
    budget = models.CharField(max_length=32, choices=BUDGET_CHOICES, blank=True)
    details = models.TextField(max_length=5000)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contact_messages'
        ordering = ['-created_at']
        verbose_name_plural = "Contact inquiries"

    def __str__(self):
        return f"{self.name} \u2014 {self.get_service_display()}"
