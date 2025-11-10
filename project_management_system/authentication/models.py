# authentication/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import JSONField 

class Group(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    teachers = models.ManyToManyField('User', related_name='teaching_groups', blank=True)
    students = models.ManyToManyField('User', related_name='student_groups', blank=True)

    def __str__(self):
        return self.name

class User(AbstractUser):
    ROLE_CHOICES = (
        ('Student', 'Student'),
        ('Teacher', 'Teacher'),
        ('HOD/Admin', 'HOD/Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')

    def __str__(self):
        return self.username

class ProjectSubmission(models.Model):
    STATUS_CHOICES = (
        ('Submitted', 'Submitted'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Archived', 'Archived'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True) # New Field
    title = models.CharField(max_length=255)
    abstract_text = models.TextField()
    
    abstract_file = models.FileField(upload_to='project_abstracts/', null=True, blank=True)
    audio_file = models.FileField(upload_to='project_audio/', null=True, blank=True)
    
    transcribed_text = models.TextField(null=True, blank=True)
    
    # New AI analysis fields
    embedding = JSONField(null=True, blank=True)
    relevance_score = models.FloatField(null=True, blank=True)
    feasibility_score = models.FloatField(null=True, blank=True)
    innovation_score = models.FloatField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted')

    submitted_at = models.DateTimeField(auto_now_add=True)
    tags = JSONField(null=True, blank=True) # To store ["tag1", "tag2"]
    def __str__(self):
        return f'{self.title} by {self.student.username}'
class Project(models.Model):
    # A status field specific to the project's lifecycle
    STATUS_CHOICES = (
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Archived', 'Archived'),
    )
    CATEGORY_CHOICES = (
        ('Web Development', 'Web Development'),
        ('Mobile App', 'Mobile App'),
        ('Machine Learning', 'Machine Learning'),
        ('Cybersecurity', 'Cybersecurity'),
        ('IoT', 'IoT'),
        ('Other', 'Other'),
    )
    progress_percentage = models.IntegerField(default=0)
    # Link to the original submission (OneToOneField)
    submission = models.OneToOneField(ProjectSubmission, on_delete=models.CASCADE, related_name='project')
    
    title = models.CharField(max_length=255)
    abstract = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    
    # Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='In Progress')
    final_report = models.FileField(upload_to='final_reports/', null=True, blank=True)
    
    # Progress field for conditional viva
    progress_percentage = models.IntegerField(default=0) # New field for progress tracking

    def __str__(self):
        return self.title

# Model to link users to the approved project
class Team(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='team')
    members = models.ManyToManyField('User', related_name='active_projects')

    def __str__(self):
        return f'Team for {self.project.title}'
class Message(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False) # Optional: For read receipts

    def __str__(self):
        return f'Msg from {self.sender.username} to {self.recipient.username} on {self.project.title}'

    class Meta:
        ordering = ['timestamp']
class VivaSession(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='viva_sessions')
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Viva for {self.project.title} by {self.student.username} at {self.created_at}"

class VivaQuestion(models.Model):
    session = models.ForeignKey(VivaSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    student_answer = models.TextField(blank=True, null=True)
    ai_score = models.IntegerField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Q: {self.question_text[:30]}..."
class ProgressUpdate(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='progress_updates')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_updates')
    update_text = models.TextField()
    ai_suggested_percentage = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Update for {self.project.title} ({self.ai_suggested_percentage}%)"
    
    class Meta:
        ordering = ['-created_at']