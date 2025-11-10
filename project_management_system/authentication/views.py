# authentication/views.py
import requests # <-- ADD THIS
import json
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from .models import ProjectSubmission, Project, Team, User, Group, Message, VivaSession, VivaQuestion
from .serializers import ProjectSubmissionSerializer, TeacherSubmissionSerializer, UserSerializer, MessageSerializer
from project_management.project_analyzer import ProjectAnalyzer
from .permissions import IsTeacherOrAdmin, IsProjectMemberOrTeacher
from django.utils import timezone
from rest_framework import generics
from django.db.models import Count, Sum
from .serializers import ProjectSerializer
from .serializers import GroupSerializer
from django.db.models import Q
import re
from .models import Project, ProgressUpdate
from rest_framework import views
from rest_framework.permissions import AllowAny
from .serializers import SimilarProjectSerializer
from .serializers import ApprovedProjectSerializer ,StudentSubmissionSerializer ,VivaSessionSerializer, VivaQuestionSerializer, ProgressUpdateSerializer
from django.shortcuts import get_object_or_404

analyzer = ProjectAnalyzer()

# --- NEW HELPER FUNCTION TO BUILD CONTEXT ---
def _build_project_context(project: Project) -> str:
    """
    Helper method to construct a detailed text summary of a project.
    """
    # 1. Basic Info
    context = f"PROJECT REPORT (ID: {project.id})\n"
    context += f"Title: {project.title}\n"
    context += f"Status: {project.status}\n"
    context += f"Progress: {project.progress_percentage}%\n"
    context += f"Category: {project.category}\n"

    # 2. Student Info
    student = project.submission.student
    context += f"\nSTUDENT DETAILS\n"
    context += f"Name: {student.first_name} {student.last_name} (Username: {student.username})\n"
    context += f"Email: {student.email}\n"

    # 3. Initial AI Evaluation
    sub = project.submission
    context += f"\nINITIAL PROPOSAL EVALUATION\n"
    context += f"Relevance Score: {sub.relevance_score}/10\n"
    context += f"Feasibility Score: {sub.feasibility_score}/10\n"
    context += f"Innovation Score: {sub.innovation_score}/10\n"
    context += f"Abstract: {sub.abstract_text}\n"

    # 4. --- (NEW SECTION) --- PROGRESS UPDATE HISTORY ---
    progress_logs = ProgressUpdate.objects.filter(project=project).order_by('created_at')
    context += f"\nPROGRESS UPDATE HISTORY ({progress_logs.count()} updates)\n"
    if not progress_logs.exists():
        context += "No progress logs have been submitted yet.\n"
    else:
        for i, log in enumerate(progress_logs, 1):
            context += f"\n-- Log {i} ({log.created_at.strftime('%Y-%m-%d')}) --\n"
            context += f"Student's Report: {log.update_text}\n"
            context += f"AI-Suggested Progress After this update: {log.ai_suggested_percentage}%\n"
    # --- (END OF NEW SECTION) ---

    # 5. Viva History
    viva_sessions = VivaSession.objects.filter(project=project).order_by('created_at')
    context += f"\nVIVA EXAMINATION HISTORY ({viva_sessions.count()} sessions)\n"
    if not viva_sessions.exists():
        context += "No viva sessions have been attempted yet.\n"
    else:
        for i, session in enumerate(viva_sessions, 1):
            context += f"\n-- Session {i} ({session.created_at.strftime('%Y-%m-%d')}) --\n"
            total_score = 0
            total_questions = 0
            for q in session.questions.all():
                context += f"Q: {q.question_text}\n"
                context += f"A: {q.student_answer if q.student_answer else 'Not answered'}\n"
                context += f"Score: {q.ai_score}/10\n"
                context += f"Feedback: {q.ai_feedback}\n"
                if q.ai_score is not None:
                    total_score += q.ai_score
                    total_questions += 1
            avg_score = (total_score / total_questions) if total_questions > 0 else 0
            context += f"Avg Score for Session {i}: {avg_score:.1f}/10\n"

    return context
# --- END HELPER FUNCTION ---


class ProjectSubmissionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser,)

    def post(self, request, *args, **kwargs):
        # ... (code remains the same)
        user = request.user
        if user.is_anonymous:
             return Response({"error": "User must be logged in."}, status=status.HTTP_401_UNAUTHORIZED)
        student_groups = list(user.student_groups.all())
        if not student_groups:
            return Response({"error": "You must be a member of a group to submit a project."}, status=status.HTTP_400_BAD_REQUEST)
        group = student_groups[0]
        abstract_text = request.data.get('abstract_text', '').strip()
        title = request.data.get('title', '').strip()
        abstract_file = request.FILES.get('abstract_file')
        audio_file = request.FILES.get('audio_file')
        data = {
            'title': title, 'abstract_text': abstract_text, 'abstract_file': abstract_file,
            'audio_file': audio_file, 'group': group.id, 'relevance_score': 0.0,
            'feasibility_score': 0.0, 'innovation_score': 0.0,
        }
        transcribed_text = None
        if audio_file:
            transcribed_text = "Transcription successful."
        if transcribed_text:
            data['abstract_text'] = transcribed_text
        serializer = ProjectSubmissionSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        text_to_analyze = data['abstract_text'] or data['title']
        existing_submissions = ProjectSubmission.objects.filter(
            ~Q(status='Rejected')
        ).values('abstract_text', 'title', 'student__username')
        analysis_result = analyzer.check_plagiarism_and_suggest_features(
            title=title, abstract=abstract_text,
            existing_submissions=list(existing_submissions)
        )
        if analysis_result['originality_status'] == "BLOCKED_HIGH_SIMILARITY":
            similar_project_data = {}
            if analysis_result['most_similar_project']:
                similar_project_data = SimilarProjectSerializer(analysis_result['most_similar_project']).data
            return Response({
                "detail": "Submission Blocked: High Similarity Detected. Please revise your idea.",
                "suggestions": analysis_result['full_report'],
                "similar_project": similar_project_data
            }, status=status.HTTP_409_CONFLICT)
        new_embedding = analyzer.get_embedding(text_to_analyze)
        tags = None
        try:
            # Call our FastAPI server (which must be running on port 8001)
            response = requests.post(
                "http://127.0.0.1:8001/extract-keywords", 
                json={"text": text_to_analyze},
                timeout=5 # Set a 5-second timeout
            )
            if response.status_code == 200:
                tags = response.json().get('keywords')
            else:
                print(f"AI microservice error: {response.text}")

        except requests.ConnectionError:
            # This is CRITICAL. If the AI server is down, we don't 
            # want the whole submission to fail. We just log it and move on.
            print("Error: Could not connect to AI microservice at port 8001.")
        except Exception as e:
            print(f"An unknown error occurred during AI call: {e}")

        serializer.save(
            student=user, embedding=new_embedding,
            relevance_score=analysis_result['relevance'],
            feasibility_score=analysis_result['feasibility'],
            innovation_score=analysis_result['innovation'],
            transcribed_text=transcribed_text,
            tags=tags
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class TeacherDashboardView(APIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request, *args, **kwargs):
        submissions = ProjectSubmission.objects.all().order_by('-submitted_at')
        serializer = TeacherSubmissionSerializer(submissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request, submission_id, *args, **kwargs):
        try:
            submission = ProjectSubmission.objects.get(id=submission_id)
        except ProjectSubmission.DoesNotExist:
            return Response({"detail": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
        teacher_groups = request.user.teaching_groups.all()
        if submission.group not in teacher_groups:
            return Response({"detail": "You do not have permission to review this project."}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        if new_status not in ['Approved', 'Rejected']:
            return Response({"detail": "Invalid status. Must be 'Approved' or 'Rejected'."}, status=status.HTTP_400_BAD_REQUEST)
        if submission.status != 'Submitted':
            return Response({"detail": "This project has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)
        submission.status = new_status
        submission.save()
        if new_status == 'Approved':
            project = Project.objects.create(
                submission=submission, title=submission.title,
                abstract=submission.abstract_text, status='In Progress'
            )
            team = Team.objects.create(project=project)
            team.members.add(submission.student)
        serializer = TeacherSubmissionSerializer(submission)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class StudentDashboardView(APIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        submissions = ProjectSubmission.objects.filter(student=request.user).order_by('-submitted_at')
        serializer = StudentSubmissionSerializer(submissions, many=True) 
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class AIChatbotView(APIView):
    # --- THIS VIEW IS UNCHANGED ---
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser,) 
    def post(self, request, *args, **kwargs):
        user_prompt = request.data.get('prompt')
        audio_file = request.data.get('audio_file')
        if not user_prompt and not audio_file:
            return Response({"error": "Prompt or audio file not provided."}, status=status.HTTP_400_BAD_REQUEST)
        if audio_file:
            user_prompt = analyzer.transcribe_audio(audio_file.temporary_file_path())
            if not user_prompt:
                return Response({"error": "Failed to transcribe audio."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        conversation_history = ""
        # Calls get_chat_response with NO context
        ai_response = analyzer.get_chat_response(user_prompt, conversation_history) 
        return Response({"response": ai_response}, status=status.HTTP_200_OK)
    
class AIVivaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        project_id = request.data.get('project_id')
        if not project_id:
             return Response({"error": "Project ID required."}, status=status.HTTP_400_BAD_REQUEST)

        project = get_object_or_404(Project, id=project_id)

        # --- THIS IS THE NEW LOGIC ---
        # Find the most recent progress log for this project
        # .first() works because our model's Meta orders by '-created_at'
        latest_log = ProgressUpdate.objects.filter(project=project).first()

        latest_update_text = None
        if latest_log:
            latest_update_text = latest_log.update_text
        # --- END OF NEW LOGIC ---

        # Now we pass this new text (or None) to the analyzer
        questions_text_list = analyzer.generate_viva_questions(
            title=project.title,
            abstract=project.abstract,
            progress_percentage=project.progress_percentage,
            latest_update_text=latest_update_text # <-- PASS THE NEW DATA HERE
        )

        session = VivaSession.objects.create(project=project, student=request.user)
        viva_questions = []
        for q_text in questions_text_list:
            viva_questions.append(VivaQuestion(session=session, question_text=q_text))
        VivaQuestion.objects.bulk_create(viva_questions)

        serializer = VivaSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AIVivaEvaluationView(APIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        question_id = request.data.get('question_id')
        student_answer = request.data.get('answer')
        if not question_id or not student_answer:
            return Response({"error": "Question ID and answer are required."}, status=status.HTTP_400_BAD_REQUEST)
        viva_question = get_object_or_404(VivaQuestion, id=question_id)
        if viva_question.session.student != request.user:
             return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)
        abstract = viva_question.session.project.abstract
        evaluation_result = analyzer.evaluate_viva_answer(
            question=viva_question.question_text,
            answer=student_answer,
            abstract=abstract
        )
        try:
             score_int = int(float(evaluation_result['score']))
        except (ValueError, TypeError):
             score_int = 0
        viva_question.student_answer = student_answer
        viva_question.ai_score = score_int
        viva_question.ai_feedback = evaluation_result['feedback']
        viva_question.save()
        return Response(VivaQuestionSerializer(viva_question).data, status=status.HTTP_200_OK)

class ProjectArchiveView(APIView):
    # ... (code remains the same, but fixed 'end_date' error)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    def patch(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in ['Completed', 'Archived']:
            return Response({"detail": "Invalid status. Must be 'Completed' or 'Archived'."}, status=status.HTTP_400_BAD_REQUEST)
        if new_status == 'Completed':
            if project.status == 'In Progress':
                project.status = 'Completed'
                # project.end_date = timezone.now() # This field was removed, so we remove the line
                project.save()
            else:
                return Response({"detail": "Project must be 'In Progress' to be marked as 'Completed'."}, status=status.HTTP_400_BAD_REQUEST)
        elif new_status == 'Archived':
            if project.status == 'Completed':
                project.status = 'Archived'
                project.save()
            else:
                return Response({"detail": "Project must be 'Completed' to be archived."}, status=status.HTTP_400_BAD_REQUEST)
        submission = project.submission
        submission.status = new_status
        submission.save()
        return Response({"detail": f"Project status updated to {new_status}."}, status=status.HTTP_200_OK)

class AnalyticsView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    def get_queryset(self): return None
    def list(self, request, *args, **kwargs):
        status_counts = Project.objects.values('status').annotate(count=Count('status'))
        category_counts = Project.objects.values('category').annotate(count=Count('category'))
        top_innovative = Project.objects.filter(status='Completed').order_by('-submission__innovation_score')[:5]
        top_innovative_data = [{'title': p.title, 'score': p.submission.innovation_score} for p in top_innovative]
        data = {
            'project_status_counts': list(status_counts),
            'project_category_counts': list(category_counts),
            'top_innovative_projects': top_innovative_data,
        }
        return Response(data, status=status.HTTP_200_OK)

class LeaderboardView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    def get_queryset(self):
        queryset = User.objects.annotate(
            total_innovation=Sum('active_projects__project__submission__innovation_score')
        )
        return queryset.filter(
            total_innovation__isnull=False,
            active_projects__project__status='Completed'
        ).order_by('-total_innovation')[:10]

class AlumniPortalView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSubmissionSerializer 
    def get_queryset(self):
        return ProjectSubmission.objects.filter(
            student=self.request.user,
            status__in=['Completed', 'Archived']
        ).order_by('-submitted_at')
    
class AllProjectsView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class AdminDashboardView(APIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    def get(self, request, *args, **kwargs):
        users = User.objects.all()
        groups = Group.objects.all()
        user_serializer = UserSerializer(users, many=True)
        group_serializer = GroupSerializer(groups, many=True)
        return Response({'users': user_serializer.data, 'groups': group_serializer.data}, status=status.HTTP_200_OK)
    def patch(self, request, group_id, *args, **kwargs):
        return Response({"detail": "Group update not implemented yet."}, status=status.HTTP_200_OK)

class AppointedTeacherDashboard(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = TeacherSubmissionSerializer
    def get_queryset(self):
        teacher_groups = self.request.user.teaching_groups.all()
        return ProjectSubmission.objects.filter(
            group__in=teacher_groups,
            status='Submitted'
        ).order_by('-submitted_at')

class UnappointedTeacherDashboard(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = TeacherSubmissionSerializer
    def get_queryset(self):
        teacher_groups = self.request.user.teaching_groups.all()
        return ProjectSubmission.objects.filter(
            ~Q(group__in=teacher_groups)
        ).order_by('-submitted_at')

class ProjectProgressView(views.APIView):
    # ... (code remains the same, fixed to return project_id)
    permission_classes = [IsAuthenticated]
    def get(self, request, project_id, *args, **kwargs):
        try:
            # param is submission_id, so we find project by submission
            project = Project.objects.get(submission__id=project_id) 
            return Response({"progress_percentage": project.progress_percentage, "project_id": project.id}, status=status.HTTP_200_OK)
        except Project.DoesNotExist:
            return Response({"progress_percentage": 0, "project_id": None}, status=status.HTTP_200_OK)

class ProjectLogUpdateView(APIView):
    """
    Handles a student POSTing a new text progress update.
    The AI analyzes the text, determines a new percentage,
    saves the log, and updates the main Project's progress.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id, *args, **kwargs):
        project = get_object_or_404(Project, id=project_id)
        
        # Check permissions
        if project.submission.student != request.user:
            return Response({"error": "You do not own this project."}, status=status.HTTP_403_FORBIDDEN)
        
        update_text = request.data.get('update_text')
        if not update_text:
            return Response({"error": "update_text is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Call the new AI analyzer method
        ai_percentage = analyzer.analyze_progress_update(
            project_abstract=project.abstract,
            update_text=update_text
        )

        # 1. Save the new log entry
        log_entry = ProgressUpdate.objects.create(
            project=project,
            author=request.user,
            update_text=update_text,
            ai_suggested_percentage=ai_percentage
        )

        # 2. Update the main Project's percentage
        project.progress_percentage = ai_percentage
        project.save()

        # Return the newly created log entry
        serializer = ProgressUpdateSerializer(log_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class TopAlumniProjectsView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [AllowAny]
    serializer_class = ProjectSubmissionSerializer
    def get_queryset(self):
        return ProjectSubmission.objects.filter(
            status__in=['Completed', 'Archived']
        ).order_by('-innovation_score', '-relevance_score', '-feasibility_score')[:10]
    
class ApprovedProjectsView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = ApprovedProjectSerializer
    def get_queryset(self):
        return Project.objects.filter(
            status__in=['In Progress', 'Completed', 'Archived']
        ).order_by('-submission__submitted_at')

class ProjectMessagesView(generics.ListCreateAPIView):
    """
    View for listing and creating messages related to a specific project.
    """
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        return Message.objects.filter(project=project)

    def get_permissions(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        return [IsAuthenticated(), IsProjectMemberOrTeacher()]

    def perform_create(self, serializer):
        """
        This method is now responsible for finding recipients and saving messages.
        The serializer instance passed in already has the request context.
        """
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        sender = self.request.user
        recipients = []

        if sender.role == 'Student':
            if project.submission and project.submission.group:
                group = project.submission.group
                teachers_in_group = list(group.teachers.all())
                recipients.extend(teachers_in_group)
        elif sender.role == 'Teacher' or sender.role == 'HOD/Admin':
             try:
                 students_in_team = list(project.team.members.filter(role='Student'))
                 recipients.extend(students_in_team)
             except Team.DoesNotExist:
                 raise serializers.ValidationError("Team not found for this project.")

        if not recipients:
             raise serializers.ValidationError("Could not determine recipient(s).")

        # Create a list to hold the new message instances we create
        created_messages = []
        for recipient in recipients:
             # We call serializer.save(), which calls serializer.create()
             # serializer.create() adds the sender from context
             # We pass project and recipient directly to save()
             msg_instance = serializer.save(project=project, recipient=recipient)
             created_messages.append(msg_instance)
        
        # Store the created instances on the view for the 'create' method to use
        self._created_messages = created_messages

    def create(self, request, *args, **kwargs):
        """
        Override create to return the list of created message objects,
        not just the initial request data.
        """
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        self.check_object_permissions(request, project)
        
        # We must pass the request context so the serializer can find self.request.user
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # This will call our modified perform_create and set self._created_messages
        self.perform_create(serializer)
        
        # Now, serialize the messages we just created to return them
        output_data = self.get_serializer(self._created_messages, many=True).data
        
        headers = self.get_success_headers(output_data)
        
        # Return the list of created messages
        return Response(output_data, status=status.HTTP_201_CREATED, headers=headers)

    def check_object_permissions(self, request, obj):
         project = obj if isinstance(obj, Project) else obj.project 
         for permission in self.get_permissions():
              if not permission.has_object_permission(request, self, project):
                   self.permission_denied(request)
    def list(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        self.check_object_permissions(request, project)
        return super().list(request, *args, **kwargs)

class ProjectVivaListView(generics.ListAPIView):
    # ... (code remains the same)
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = VivaSessionSerializer
    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        return VivaSession.objects.filter(project=project).order_by('-created_at')

# --- NEW VIEW FOR CONTEXT-AWARE CHAT ---
# This replaces the logic from the old ProjectInquiryView
class ProjectInquiryView(APIView):
    """
    Allows teachers to ask AI questions about a specific project.
    Gathers all project data from DB to provide context to the AI.
    """
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request, *args, **kwargs):
        project_id = request.data.get('project_id')
        user_prompt = request.data.get('prompt')

        if not project_id or not user_prompt:
             return Response({"error": "Project ID and prompt are required."}, status=status.HTTP_400_BAD_REQUEST)

        project = get_object_or_404(Project, id=project_id)

        # 1. Build the rich context from the database
        context = _build_project_context(project) # Use the helper function

        # 2. Get AI response using the context
        ai_response = analyzer.get_chat_response(prompt=user_prompt, context=context, conversation_history=[])

        return Response({"response": ai_response}, status=status.HTTP_200_OK)
class AdminUserRoleView(APIView):
    """
    Allows HOD/Admins to update the role of any user.
    """
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin] # Ensures only admin can do this

    def patch(self, request, user_id, *args, **kwargs):
        user_to_update = get_object_or_404(User, id=user_id)
        new_role = request.data.get('role')

        if not new_role:
            return Response({"error": "New 'role' is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate the new role
        valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
        if new_role not in valid_roles:
            return Response({"error": f"Invalid role. Must be one of {valid_roles}."}, status=status.HTTP_400_BAD_REQUEST)

        # Update and save the user's role
        user_to_update.role = new_role
        user_to_update.save()

        # Return the updated user data
        serializer = UserSerializer(user_to_update)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminGroupManagementView(APIView):
    """
    Allows HOD/Admins to add or remove students/teachers from a group.
    """
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def patch(self, request, group_id, *args, **kwargs):
        group = get_object_or_404(Group, id=group_id)
        
        user_id = request.data.get('user_id')
        action = request.data.get('action') # e.g., 'add_student', 'remove_student', 'add_teacher', 'remove_teacher'

        if not user_id or not action:
            return Response({"error": "'user_id' and 'action' are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, id=user_id)

        try:
            if action == 'add_student':
                group.students.add(user)
            elif action == 'remove_student':
                group.students.remove(user)
            elif action == 'add_teacher':
                group.teachers.add(user)
            elif action == 'remove_teacher':
                group.teachers.remove(user)
            else:
                return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({"error": f"Could not perform action: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Return the updated group data
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)
class ProjectProgressLogListView(generics.ListAPIView):
    """
    Returns a list of all progress updates for a single project.
    (For teachers to review)
    """
    permission_classes = [IsAuthenticated, IsProjectMemberOrTeacher]
    serializer_class = ProgressUpdateSerializer

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        return ProgressUpdate.objects.filter(project_id=project_id)

    # Add permission check for the project object
    def list(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        
        # Manually check object permission for the associated project
        for permission in self.get_permissions():
            if not permission.has_object_permission(request, self, project):
                self.permission_denied(request)
                
        return super().list(request, *args, **kwargs)