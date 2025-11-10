# authentication/serializers.py
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User, ProjectSubmission, Group, Project, Team, Message, VivaSession, VivaQuestion, ProgressUpdate
from django.db.models import JSONField


# User serializers
class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')

class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'role') # 'role' field must be here
        read_only_fields = ('role',)

# Main Project Submission serializer
class ProjectSubmissionSerializer(serializers.ModelSerializer):
    # This serializer is used for both students and teachers
    student = UserSerializer(read_only=True)
    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all())

    class Meta:
        model = ProjectSubmission
        fields = ('id', 'student', 'title', 'abstract_text', 'abstract_file', 'audio_file', 'transcribed_text', 'submitted_at', 'group','embedding', # This field is important for Plagiarism Check
            'relevance_score', # Missing field
            'feasibility_score', # Missing field
            'innovation_score','status','tags')
        read_only_fields = ('student', 'submitted_at', 'transcribed_text')
    def create(self, validated_data):
        # 1. Pop the custom, calculated fields that are passed by the view's serializer.save()
        embedding = validated_data.pop('embedding', None)
        relevance_score = validated_data.pop('relevance_score', 0.0)
        feasibility_score = validated_data.pop('feasibility_score', 0.0)
        innovation_score = validated_data.pop('innovation_score', 0.0)
        
        tags = validated_data.pop('tags', None)
        # 2. Create the instance with all remaining fields
        instance = ProjectSubmission.objects.create(**validated_data)
        
        # 3. Manually assign the popped fields to the instance
        instance.embedding = embedding
        instance.relevance_score = relevance_score
        instance.feasibility_score = feasibility_score
        instance.innovation_score = innovation_score
        instance.tags = tags
        instance.save()
        return instance

# Serializer for the teacher dashboard (read-only)
class TeacherSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for the teacher dashboard (read-only), now includes project_id.
    """
    student = UserSerializer(read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    # Get project_id using a method field to handle cases where project might not exist yet
    project_id = serializers.SerializerMethodField()

    class Meta:
        model = ProjectSubmission
        fields = (
            'id',
            'student',
            'group',
            'group_name',
            'title',
            'abstract_text',
            'relevance_score',
            'feasibility_score',
            'innovation_score',
            'status',
            'project_id', # Added project_id
            'tags'
        )
        read_only_fields = (
            'id',
            'student',
            'group',
            'group_name',
            'status',
            'project_id', # Mark project_id as read-only
            'relevance_score', # Scores should also be read-only in this view
            'feasibility_score',
            'innovation_score',
            'abstract_text', # Abstract is likely read-only here too
            'title', # Title is likely read-only here too
            'tags'
        )

    def get_project_id(self, obj):
        """
        Safely retrieves the related Project's ID if it exists.
        'obj' here is the ProjectSubmission instance.
        """
        try:
            # Access the related Project via the 'project' related_name
            # established in the Project model's OneToOneField
            if hasattr(obj, 'project') and obj.project:
                return obj.project.id
        except Project.DoesNotExist: # Use the correct exception name
             # This can happen if the submission exists but the project hasn't been created
             return None
        except AttributeError:
             # This handles cases where 'project' related name might not be set up yet
             # during migrations or development, though less likely with OneToOneField.
             return None
        return None
class ProjectSerializer(serializers.ModelSerializer):
    submission = ProjectSubmissionSerializer(read_only=True)
    team = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'title', 'abstract', 'category', 'status', 'final_report', 'submission', 'team')
        read_only_fields = ('submission', 'team')
class GroupSerializer(serializers.ModelSerializer):
    teachers = UserSerializer(many=True, read_only=True)
    students = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ('id', 'name', 'description', 'teachers', 'students')

class SimilarProjectSerializer(serializers.Serializer):
    """
    A simple serializer for returning details about a similar project.
    """
    title = serializers.CharField()
    student = serializers.CharField()
    abstract_text = serializers.CharField()
class ApprovedProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for the teacher's view of approved and in-progress projects.
    """
    student_name = serializers.CharField(source='submission.student.username', read_only=True)
    submission_id = serializers.IntegerField(source='submission.id', read_only=True)

    class Meta:
        model = Project
        fields = (
            'id', 
            'submission_id',
            'title', 
            'student_name', 
            'status', 
            'progress_percentage', 
            'category'
        )
class StudentSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for the student's dashboard, including project progress and ID.
    """
    group_name = serializers.CharField(source='group.name', read_only=True)
    progress = serializers.IntegerField(source='project.progress_percentage', read_only=True, allow_null=True)
    # ADD project_id directly from the related Project model
    project_id = serializers.IntegerField(source='project.id', read_only=True, allow_null=True)

    class Meta:
        model = ProjectSubmission
        fields = (
            'id', # Submission ID
            'group_name',
            'title',
            'status',
            'progress',
            'project_id' # <-- Added the Project ID
        )
class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)

    class Meta:
        model = Message
        fields = (
            'id', 
            'project', 
            'sender', 
            'sender_username', 
            'recipient', 
            'recipient_username', 
            'content', 
            'timestamp', 
            'is_read'
        )
        # ADD 'project' and 'recipient' to read_only_fields
        read_only_fields = (
            'id', # ID is also read-only
            'project', 
            'sender', 
            'recipient', 
            'timestamp', 
            'sender_username', 
            'recipient_username', 
            'is_read'
        )

    # create method remains the same
    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)
class VivaQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VivaQuestion
        fields = ['id', 'question_text', 'student_answer', 'ai_score', 'ai_feedback']
        read_only_fields = ['question_text', 'ai_score', 'ai_feedback'] # Student only updates answer initially

class VivaSessionSerializer(serializers.ModelSerializer):
    questions = VivaQuestionSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = VivaSession
        fields = ['id', 'project', 'student_name', 'created_at', 'questions']
class ProgressUpdateSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = ProgressUpdate
        fields = (
            'id', 
            'project', 
            'author_username', 
            'update_text', 
            'ai_suggested_percentage', 
            'created_at'
        )
        read_only_fields = (
            'id', 
            'project', 
            'author_username', 
            'ai_suggested_percentage', 
            'created_at'
        )